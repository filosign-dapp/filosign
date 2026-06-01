import {
	computeCommitment,
	jsonStringify,
	signatures,
	toBytes,
} from "@filosign/crypto-utils/node";
import { throwAppError } from "@filosign/errors/server";
import {
	completionsMerkleRootV1,
	hashAuthSubjectCommitment,
	hashNormalizedSignerEmail,
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
import { tryExecuteAttachmentReleasesForPiece } from "@/lib/domains/attachments";
import { requireCanSign } from "@/lib/domains/files/utils/participant-access";
import {
	assertSettlementRecipientAckProvided,
	recordSettlementRecipientAck,
} from "@/lib/domains/settlement-access/utils/recipient-ack";
import { tryExecuteSettlementRulesForPiece } from "@/lib/domains/settlements";
import { SERVER_ANALYTICS_EVENTS } from "@/lib/platform/analytics/events";
import { trackServerEvent } from "@/lib/platform/analytics/track";
import db from "@/lib/platform/db";
import {
	evmClient,
	fsEnvelopeRegistryAt,
	relayRegisterEnvelopeSignature,
} from "@/lib/platform/evm";
import { logger } from "@/lib/platform/pino";
import { zodSafeParseMessage } from "@/lib/platform/utils/zodHttp";
import { isEnvelopeFullySigned } from "./envelope-completion";
import { primaryEmailForWallet } from "./file-invites";

const { files, fileParticipants, fileSignatures, fileSignerDrafts, users } =
	db.schema;

export async function pieceSign(args: {
	userWallet: Address;
	pieceCid: string;
	body: unknown;
	requestIp?: string | null;
	requestUserAgent?: string | null;
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
			completedFieldIds: z.array(z.string()),
			settlementRecipientAck: z
				.object({
					termsVersion: z.string().min(1),
					acceptedAt: z.number().int().positive(),
				})
				.optional(),
		})
		.safeParse(args.body);
	if (parsedBody.error) {
		throw new ORPCError("BAD_REQUEST", {
			message: zodSafeParseMessage(parsedBody.error),
		});
	}
	const { signature, timestamp, dl3Signature, completedFieldIds } =
		parsedBody.data;

	await assertSettlementRecipientAckProvided({
		pieceCid,
		signerWallet: userWallet,
		body: parsedBody.data,
	});

	const [fileRecord] = await db
		.select({
			pieceCid: files.pieceCid,
			sender: files.sender,
			registryAddress: files.registryAddress,
			placementCommitment: files.placementCommitment,
			placementManifestJson: files.placementManifestJson,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid));

	if (!fileRecord) {
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
	}

	const userWalletNorm = getAddress(userWallet);
	const isSender = getAddress(fileRecord.sender) === userWalletNorm;

	const manifestParsed = zPlacementManifest.safeParse(
		fileRecord.placementManifestJson,
	);
	if (!manifestParsed.success) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "File placement manifest missing or invalid",
		});
	}

	let signerWallet: Address;
	let authProviderId: string;
	let signerEmail: string;

	if (isSender) {
		const senderEmail = await primaryEmailForWallet(userWalletNorm);
		if (!senderEmail) {
			throwAppError("SIGNING.EMAIL_REQUIRED");
		}
		const assignedForSender = manifestParsed.data.fields.filter(
			(f) => f.assignedRecipientEmail === senderEmail,
		);
		if (assignedForSender.length === 0) {
			throwAppError("SIGNING.NOT_REQUIRED");
		}

		const [senderUser] = await db
			.select({ authProviderId: users.authProviderId })
			.from(users)
			.where(eq(users.walletAddress, userWalletNorm));

		if (!senderUser?.authProviderId) {
			throwAppError("SIGNING.NOT_REQUIRED");
		}

		const [existingSig] = await db
			.select({ signer: fileSignatures.signer })
			.from(fileSignatures)
			.where(
				and(
					eq(fileSignatures.filePieceCid, pieceCid),
					eq(fileSignatures.signer, userWalletNorm),
				),
			);
		if (existingSig) {
			throwAppError("SIGNING.ALREADY_SIGNED");
		}

		signerWallet = userWalletNorm;
		authProviderId = senderUser.authProviderId;
		signerEmail = senderEmail;
	} else {
		const [participantRecord] = await db
			.select({
				wallet: fileParticipants.wallet,
				authProviderId: users.authProviderId,
			})
			.from(fileParticipants)
			.innerJoin(users, eq(fileParticipants.wallet, users.walletAddress))
			.where(
				and(
					eq(fileParticipants.filePieceCid, pieceCid),
					eq(fileParticipants.role, "signer"),
					eq(fileParticipants.wallet, userWalletNorm),
				),
			);

		if (!participantRecord) {
			throwAppError("SIGNING.NOT_REQUIRED");
		}

		// Ordering vs ack/view uses server time; chain `timestamp` can lag wall clock
		// (common on local chains) and must not be compared to DB view timestamps.
		await requireCanSign({
			wallet: userWallet,
			pieceCid,
			signAt: new Date(),
		});

		signerWallet = getAddress(participantRecord.wallet);
		authProviderId = participantRecord.authProviderId;
		const email = await primaryEmailForWallet(participantRecord.wallet);
		if (!email) {
			throwAppError("SIGNING.EMAIL_REQUIRED");
		}
		signerEmail = email;
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
			throwAppError("SIGNING.PLACEMENT_INCOMPLETE");
		}
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
			signer: signerWallet,
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
		.where(eq(users.walletAddress, signerWallet));

	const dl3SignatureMessage = jsonStringify({
		pieceCid,
		sender: fileRecord.sender,
		signer: signerWallet,
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

	const privySubjectCommitment = hashAuthSubjectCommitment(authProviderId);

	const registerSignatureArgs = [
		pieceCid,
		fileRecord.sender,
		signerWallet,
		signerEmailCommitment,
		privySubjectCommitment,
		dl3SignatureCommitment,
		BigInt(timestamp),
		signature,
		completionsRoot,
		LEAF_SCHEMA_VERSION_V1,
	] as const;
	const registry = fsEnvelopeRegistryAt(fileRecord.registryAddress);

	try {
		await registry.simulate.registerEnvelopeSignature(registerSignatureArgs, {
			account: evmClient.account,
		});
	} catch (_err) {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid signature" });
	}

	const txHash = await relayRegisterEnvelopeSignature(
		registry,
		registerSignatureArgs,
	);

	await db.insert(fileSignatures).values({
		filePieceCid: pieceCid,
		signer: signerWallet,
		evmSignature: signature,
		dl3Signature: dl3Signature,
		onchainTxHash: txHash,
		completedFieldIds: completedFieldIdsStored,
		completionsRoot,
		leafSchemaVersion: LEAF_SCHEMA_VERSION_V1,
		createdAt: new Date(timestamp * 1000),
	});

	const recipientAck = parsedBody.data.settlementRecipientAck;
	if (recipientAck) {
		await recordSettlementRecipientAck({
			pieceCid,
			signerWallet: signerWallet,
			termsVersion: recipientAck.termsVersion,
			acceptedAt: new Date(recipientAck.acceptedAt * 1000),
			requestIp: args.requestIp,
			requestUserAgent: args.requestUserAgent,
		});
	}

	await db
		.delete(fileSignerDrafts)
		.where(
			and(
				eq(fileSignerDrafts.filePieceCid, pieceCid),
				eq(fileSignerDrafts.wallet, signerWallet),
			),
		);

	trackServerEvent({
		distinctId: signerWallet,
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

	void tryExecuteAttachmentReleasesForPiece(pieceCid).catch((err) => {
		logger.warn(
			{ err, pieceCid },
			"post-sign attachment release failed; daily sync will retry",
		);
	});

	return { txHash, signature };
}
