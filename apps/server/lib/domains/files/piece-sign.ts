import {
	computeCommitment,
	jsonStringify,
	signatures,
	toBytes,
} from "@filosign/crypto-utils/node";
import {
	completionsMerkleRootV1,
	hashNormalizedSignerEmail,
	hashPrivySubjectCommitment,
	LEAF_SCHEMA_VERSION_V1,
	requiredFieldIdsForRecipientEmail,
	zPlacementManifest,
} from "@filosign/shared";
import { zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import { tryExecuteSettlementRulesForPiece } from "@/lib/domains/settlements";
import { SERVER_ANALYTICS_EVENTS } from "@/lib/platform/analytics/events";
import { trackServerEvent } from "@/lib/platform/analytics/track";
import db from "@/lib/platform/db";
import { evmClient, fsContracts } from "@/lib/platform/evm";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { zodSafeParseMessage } from "@/lib/platform/utils/zodHttp";
import { isEnvelopeFullySigned } from "./envelope-completion";
import {
	isSenderAlreadyApprovedError,
	primaryEmailForWallet,
} from "./file-invites";

const { FSFileRegistry, FSManager } = fsContracts;
const { files, fileParticipants, fileSignatures, fileSignerDrafts, users } =
	db.schema;

export async function pieceSign(args: {
	userWallet: Address;
	pieceCid: string;
	body: unknown;
}) {
	const userWallet = args.userWallet;
	const pieceCid = args.pieceCid;
	const encoder = new TextEncoder();
	const dilithium = await signatures.dilithiumInstance();

	const parsedBody = z
		.object({
			signature: zHexString(),
			timestamp: z.number({ error: "timestamp must be a number" }),
			dl3Signature: zHexString(),
			completedFieldIds: z.array(z.string()).optional(),
			approveSender: z
				.object({
					nonce: z.coerce.bigint(),
					deadline: z.coerce.bigint(),
					signature: zHexString(),
				})
				.optional(),
		})
		.safeParse(args.body);
	if (parsedBody.error) {
		throw new ORPCError("BAD_REQUEST", {
			message: zodSafeParseMessage(parsedBody.error),
		});
	}
	const {
		signature,
		timestamp,
		dl3Signature,
		completedFieldIds,
		approveSender,
	} = parsedBody.data;

	const [fileRecord] = await db
		.select({
			pieceCid: files.pieceCid,
			sender: files.sender,
			placementCommitment: files.placementCommitment,
			placementManifestJson: files.placementManifestJson,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid));

	const [participantRecord] = await db
		.select({
			wallet: fileParticipants.wallet,
			privyDid: users.privyDid,
		})
		.from(fileParticipants)
		.innerJoin(users, eq(fileParticipants.wallet, users.walletAddress))
		.where(
			and(
				eq(fileParticipants.filePieceCid, pieceCid),
				eq(fileParticipants.role, "signer"),
				eq(fileParticipants.wallet, userWallet),
			),
		);

	if (!fileRecord) {
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
	}

	if (!participantRecord) {
		throw new ORPCError("FORBIDDEN", {
			message: "You are not required to sign this file",
		});
	}

	const manifestParsed = zPlacementManifest.safeParse(
		fileRecord.placementManifestJson,
	);
	if (!manifestParsed.success) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "File placement manifest missing or invalid",
		});
	}

	const signerAddr = getAddress(participantRecord.wallet);
	const signerEmail = await primaryEmailForWallet(participantRecord.wallet);
	if (!signerEmail) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"Add a primary email to your Filosign profile to sign placement fields",
		});
	}
	const assignedForSigner = manifestParsed.data.fields.filter(
		(f) => f.assignedRecipientEmail === signerEmail,
	);
	const allowedIds = new Set(assignedForSigner.map((f) => f.id));

	const requiredIds = requiredFieldIdsForRecipientEmail(
		manifestParsed.data,
		signerEmail,
	);

	let fieldIds: string[];
	if (completedFieldIds !== undefined) {
		fieldIds = completedFieldIds;
		const completedSet = new Set(fieldIds);
		for (const id of fieldIds) {
			if (!allowedIds.has(id)) {
				throw new ORPCError("BAD_REQUEST", {
					message: "completedFieldIds must match manifest fields for signer",
				});
			}
		}
		for (const req of requiredIds) {
			if (!completedSet.has(req)) {
				throw new ORPCError("BAD_REQUEST", {
					message: "All required fields must be marked complete before signing",
				});
			}
		}
	} else {
		fieldIds = assignedForSigner.map((f) => f.id);
	}

	if (fieldIds.length === 0) {
		throw new ORPCError("BAD_REQUEST", {
			message: "No fields to complete for this signer",
		});
	}

	const completedFieldIdsStored = [...new Set(fieldIds)].sort((a, b) =>
		a.localeCompare(b),
	);

	let completionsRoot: `0x${string}`;
	try {
		completionsRoot = completionsMerkleRootV1({
			fieldIds: completedFieldIdsStored,
			placementCommitment: fileRecord.placementCommitment,
			pieceCid,
			signer: signerAddr,
		});
	} catch {
		throw new ORPCError("BAD_REQUEST", {
			message: "Could not compute completions root",
		});
	}

	const [{ signaturePublicKey: signerDl3PubKey }] = await db
		.select({
			signaturePublicKey: users.signaturePublicKey,
		})
		.from(users)
		.where(eq(users.walletAddress, participantRecord.wallet));

	const dl3SignatureMessage = jsonStringify({
		pieceCid,
		sender: fileRecord.sender,
		signer: participantRecord.wallet,
		timestamp,
		completionsRoot,
		leafSchemaVersion: LEAF_SCHEMA_VERSION_V1,
	});
	const dl3SignatureCommitment = computeCommitment([dl3Signature]);

	const isDl3SignatureValid = await signatures.verify({
		dl: dilithium,
		message: encoder.encode(dl3SignatureMessage),
		signature: toBytes(dl3Signature),
		publicKey: toBytes(signerDl3PubKey),
	});

	if (!isDl3SignatureValid) {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid DL3 signature" });
	}

	const signerEmailCommitment = hashNormalizedSignerEmail(signerEmail);

	const privySubjectCommitment = hashPrivySubjectCommitment(
		participantRecord.privyDid,
	);

	const registerSignatureArgs = [
		pieceCid,
		fileRecord.sender,
		participantRecord.wallet,
		signerEmailCommitment,
		privySubjectCommitment,
		dl3SignatureCommitment,
		BigInt(timestamp),
		signature,
		completionsRoot,
		LEAF_SCHEMA_VERSION_V1,
	] as const;

	try {
		await FSFileRegistry.simulate.registerFileSignature(registerSignatureArgs, {
			account: evmClient.account,
		});
	} catch (_err) {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid signature" });
	}

	const txHash = await FSFileRegistry.write.registerFileSignature(
		registerSignatureArgs,
	);
	let approveSenderTxHash: string | null = null;
	if (approveSender) {
		const approveSenderArgs = [
			participantRecord.wallet,
			fileRecord.sender,
			approveSender.nonce,
			approveSender.deadline,
			approveSender.signature,
		] as const;

		const approveSimulation = await tryCatch(
			FSManager.simulate.approveSender(approveSenderArgs, {
				account: evmClient.account,
			}),
		);
		if (
			approveSimulation.error &&
			!isSenderAlreadyApprovedError(approveSimulation.error)
		) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Invalid approveSender signature",
			});
		}

		if (!approveSimulation.error) {
			const approveWrite = await tryCatch(
				FSManager.write.approveSender(approveSenderArgs),
			);
			if (approveWrite.error) {
				if (!isSenderAlreadyApprovedError(approveWrite.error)) {
					throw new ORPCError("INTERNAL_SERVER_ERROR", {
						message: "Could not approve sender",
					});
				}
			} else {
				approveSenderTxHash = approveWrite.data;
			}
		}
	}

	await db.insert(fileSignatures).values({
		filePieceCid: pieceCid,
		signer: signerAddr,
		evmSignature: signature,
		dl3Signature: dl3Signature,
		onchainTxHash: txHash,
		completedFieldIds: completedFieldIdsStored,
		completionsRoot,
		leafSchemaVersion: LEAF_SCHEMA_VERSION_V1,
		createdAt: new Date(timestamp * 1000),
	});

	await db
		.delete(fileSignerDrafts)
		.where(
			and(
				eq(fileSignerDrafts.filePieceCid, pieceCid),
				eq(fileSignerDrafts.wallet, participantRecord.wallet),
			),
		);

	trackServerEvent({
		distinctId: signerAddr,
		event: SERVER_ANALYTICS_EVENTS.pieceSigned,
		pieceCid,
		properties: {
			field_count: completedFieldIdsStored.length,
		},
	});

	if (await isEnvelopeFullySigned(pieceCid)) {
		trackServerEvent({
			distinctId: getAddress(fileRecord.sender),
			event: SERVER_ANALYTICS_EVENTS.envelopeFullySigned,
			pieceCid,
		});
	}

	void tryExecuteSettlementRulesForPiece(pieceCid).catch((err) => {
		logger.warn(
			{ err, pieceCid },
			"post-sign settlement execute failed; use Settle payment or daily sync",
		);
	});

	return { txHash, signature, approveSenderTxHash };
}
