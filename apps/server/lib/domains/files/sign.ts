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
	zRegisterRoutingInput,
} from "@filosign/shared";
import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import { tryExecuteAttachmentReleasesForPiece } from "@/lib/domains/attachments";
import { assertRecallerMayRelay } from "@/lib/domains/files/recall-auth";
import type { ActiveOrgContext } from "@/lib/domains/orgs";
import {
	assertSettlementRecipientAckProvided,
	recordSettlementRecipientAck,
} from "@/lib/domains/settlement-access/utils/recipient-ack";
import {
	SERVER_ANALYTICS_EVENTS,
	trackServerEvent,
} from "@/lib/platform/analytics";
import db from "@/lib/platform/db";
import {
	evmClient,
	fsEnvelopeRegistryAt,
	relayAmendSigner,
	relayRegisterEnvelopeSignature,
} from "@/lib/platform/evm";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { zodSafeParseMessage } from "@/lib/platform/utils/zodHttp";
import { primaryEmailForWallet } from "./invites";
import {
	isEnvelopeRoutingCompleteOnChain,
	requireCanSign,
} from "./utils/piece-helpers";
import {
	patchRoutingCalldataForAmend,
	resolveSignRoutingCalldata,
} from "./utils/routing-calldata";

const {
	files,
	fileParticipants,
	fileSignatures,
	fileSignerDrafts,
	fileSignerAmendments,
	users,
} = db.schema;

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
			organizationId: files.organizationId,
			registryAddress: files.registryAddress,
			revokedBeforeCompletedAt: files.revokedBeforeCompletedAt,
			completedAt: files.completedAt,
			registerRoutingJson: files.registerRoutingJson,
			placementCommitment: files.placementCommitment,
			placementManifestJson: files.placementManifestJson,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid));

	if (!fileRecord) {
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
	}
	if (fileRecord.revokedBeforeCompletedAt) {
		throw new ORPCError("FORBIDDEN", { message: "Envelope voided" });
	}
	if (fileRecord.completedAt) {
		throw new ORPCError("FORBIDDEN", { message: "Envelope complete" });
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

	const authSubjectCommitment = hashAuthSubjectCommitment(authProviderId);

	const registerRoutingParsed = zRegisterRoutingInput.safeParse(
		fileRecord.registerRoutingJson ?? {},
	);
	const routingCalldata = resolveSignRoutingCalldata({
		placementManifest: manifestParsed.data,
		registerRouting: registerRoutingParsed.success
			? registerRoutingParsed.data
			: undefined,
	});

	const registerSignatureArgs = [
		pieceCid,
		fileRecord.sender,
		signerWallet,
		signerEmailCommitment,
		authSubjectCommitment,
		dl3SignatureCommitment,
		BigInt(timestamp),
		signature,
		completionsRoot,
		LEAF_SCHEMA_VERSION_V1,
		routingCalldata.routingOrder,
		routingCalldata.quorumSet,
	] as const;
	const registry = fsEnvelopeRegistryAt(fileRecord.registryAddress);

	const simulateRes = await tryCatch(
		registry.simulate.registerEnvelopeSignature(registerSignatureArgs, {
			account: evmClient.account,
		}),
	);
	if (simulateRes.error) {
		throwAppError("SIGNING.SIGNATURE_INVALID");
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

	const routingComplete = await isEnvelopeRoutingCompleteOnChain(pieceCid, {
		registryAddress: getAddress(fileRecord.registryAddress),
		registerRoutingJson: fileRecord.registerRoutingJson,
	});
	if (routingComplete) {
		await db
			.update(files)
			.set({ completedAt: new Date(), updatedAt: new Date() })
			.where(eq(files.pieceCid, pieceCid));

		trackServerEvent({
			distinctId: getAddress(fileRecord.sender),
			event: SERVER_ANALYTICS_EVENTS.envelopeFullySigned,
			pieceCid,
		});

		if (fileRecord.organizationId) {
			const { createFocStubForCompletedEnvelope, orgQualifiesForFocBackup } =
				await import("@/lib/domains/foc");
			if (await orgQualifiesForFocBackup(fileRecord.organizationId)) {
				void createFocStubForCompletedEnvelope(
					pieceCid,
					fileRecord.organizationId,
				).catch((err) => {
					logger.warn(
						{ err, pieceCid, organizationId: fileRecord.organizationId },
						"completed envelope: FOC transition stub failed",
					);
				});
			}
		}
	}

	const { enqueuePayoutForPiece } = await import("@/lib/platform/jobs");
	void enqueuePayoutForPiece(pieceCid).catch((err) => {
		logger.warn(
			{ err, pieceCid },
			"post-sign settlement enqueue failed; use Settle payment or daily sync",
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

export const zAmendSignerBody = z.object({
	pieceCid: z.string().min(1),
	recaller: zEvmAddress(),
	oldCommitment: zHexString(),
	newCommitment: zHexString(),
	timestamp: z.number().int().positive(),
	signature: zHexString(),
});

export async function filesAmendSigner(
	wallet: Address,
	rawBody: unknown,
	activeOrg: ActiveOrgContext | null = null,
) {
	const parsed = zAmendSignerBody.safeParse(rawBody);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}

	const {
		pieceCid,
		recaller,
		oldCommitment,
		newCommitment,
		timestamp,
		signature,
	} = parsed.data;

	const [file] = await db
		.select({
			sender: files.sender,
			organizationId: files.organizationId,
			registryAddress: files.registryAddress,
			revokedBeforeCompletedAt: files.revokedBeforeCompletedAt,
			completedAt: files.completedAt,
			placementManifestJson: files.placementManifestJson,
			registerRoutingJson: files.registerRoutingJson,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid))
		.limit(1);
	if (!file) {
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
	}
	if (file.revokedBeforeCompletedAt) {
		throw new ORPCError("BAD_REQUEST", { message: "Envelope voided" });
	}
	if (file.completedAt) {
		throw new ORPCError("BAD_REQUEST", { message: "Envelope complete" });
	}

	const manifestParsed = zPlacementManifest.safeParse(
		file.placementManifestJson,
	);
	if (!manifestParsed.success) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "File placement manifest missing or invalid",
		});
	}
	const registerRoutingParsed = zRegisterRoutingInput.safeParse(
		file.registerRoutingJson ?? {},
	);
	const baseRouting = resolveSignRoutingCalldata({
		placementManifest: manifestParsed.data,
		registerRouting: registerRoutingParsed.success
			? registerRoutingParsed.data
			: undefined,
	});
	const routingCalldata = patchRoutingCalldataForAmend({
		...baseRouting,
		oldCommitment,
		newCommitment,
	});

	await assertRecallerMayRelay({
		wallet,
		file: {
			sender: file.sender,
			organizationId: file.organizationId,
		},
		recaller,
		activeOrg,
		registryAddress: file.registryAddress,
	});

	const registry = fsEnvelopeRegistryAt(file.registryAddress);
	const amendArgs = [
		pieceCid,
		recaller,
		oldCommitment,
		newCommitment,
		BigInt(timestamp),
		signature,
		baseRouting.routingOrder,
		routingCalldata.routingOrder,
		baseRouting.quorumSet,
		routingCalldata.quorumSet,
	] as const;

	const txHash = await tryCatch(relayAmendSigner(registry, amendArgs));
	if (txHash.error) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				txHash.error instanceof Error
					? txHash.error.message
					: "amendSigner relay failed",
		});
	}

	await db.insert(fileSignerAmendments).values({
		filePieceCid: pieceCid,
		oldCommitment,
		newCommitment,
		amendTxHash: txHash.data as `0x${string}`,
	});

	return { txHash: txHash.data };
}
