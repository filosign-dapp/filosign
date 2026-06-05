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
import { zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import { tryExecuteAttachmentReleasesForPiece } from "@/lib/domains/attachments";
import {
	assertSettlementRecipientAckProvided,
	recordSettlementRecipientAck,
} from "@/lib/domains/settlement-access/utils/recipient-ack";
import { copyArtifactToEnvelopeSnapshot } from "@/lib/domains/users/signatures";
import {
	SERVER_ANALYTICS_EVENTS,
	trackServerEvent,
} from "@/lib/platform/analytics";
import db from "@/lib/platform/db";
import {
	evmClient,
	fsEnvelopeRegistryAt,
	relayRegisterEnvelopeSignature,
} from "@/lib/platform/evm";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";
import { primaryEmailForWallet } from "./invites";
import { isSignerReplacementPendingOnChain } from "./signer-replacement";
import { buildEnvelopeCompletedEmailOutboxRows } from "./utils/completion-email";
import {
	parseFieldCompletionMap,
	validateFieldCompletionsForSigner,
} from "./utils/field-completions";
import {
	isEnvelopeRoutingCompleteOnChain,
	requireCanSign,
} from "./utils/piece-helpers";
import { resolveSignRoutingCalldata } from "./utils/routing-calldata";

const {
	files,
	fileParticipants,
	fileSignatures,
	fileSignerDrafts,
	fileFieldCompletions,
	userSignatures,
	users,
} = db.schema;

export const zPieceSignBody = z.object({
	signature: zHexString(),
	timestamp: z.number({ error: "timestamp must be a number" }),
	dl3Signature: zHexString(),
	completedFieldIds: z.array(z.string()),
	fieldCompletions: z
		.record(
			z.string(),
			z.object({
				fieldId: z.string(),
				valueKind: z.enum(["visual", "text", "checkbox", "auto"]),
				sourceArtifactId: z.uuid().nullable(),
				storageKey: z.string().nullable(),
				contentSha256: z.string().nullable(),
				textValue: z.string().nullable(),
			}),
		)
		.optional(),
	settlementRecipientAck: z
		.object({
			termsVersion: z.string().min(1),
			acceptedAt: z.number().int().positive(),
		})
		.optional(),
});

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

	const parsedBody = zPieceSignBody.safeParse(args.body);
	if (parsedBody.error) {
		throwZodBadRequest(parsedBody.error);
	}
	const {
		signature,
		timestamp,
		dl3Signature,
		completedFieldIds,
		fieldCompletions: fieldCompletionsRaw,
	} = parsedBody.data;
	const fieldCompletions = parseFieldCompletionMap(fieldCompletionsRaw ?? {});

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
		throwAppError("FILES.NOT_FOUND");
	}
	if (fileRecord.revokedBeforeCompletedAt) {
		throwAppError("FILES.ENVELOPE_VOIDED");
	}
	if (fileRecord.completedAt) {
		throwAppError("FILES.ENVELOPE_COMPLETE");
	}

	if (
		await isSignerReplacementPendingOnChain(
			fileRecord.registryAddress,
			pieceCid,
		)
	) {
		throwAppError("SIGNING.REPLACEMENT_PENDING");
	}

	const userWalletNorm = getAddress(userWallet);
	const isSender = getAddress(fileRecord.sender) === userWalletNorm;

	const manifestParsed = zPlacementManifest.safeParse(
		fileRecord.placementManifestJson,
	);
	if (!manifestParsed.success) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
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
			throwZodBadRequest(
				new z.ZodError([
					{
						code: "custom",
						message: "completedFieldIds must match manifest fields for signer",
						path: ["completedFieldIds"],
					},
				]),
			);
		}
	}
	for (const req of requiredIds) {
		if (!completedSet.has(req)) {
			throwAppError("SIGNING.PLACEMENT_INCOMPLETE");
		}
	}

	validateFieldCompletionsForSigner({
		assignedFields: assignedForSigner,
		completedFieldIds: fieldIds,
		fieldCompletions,
	});

	if (fieldIds.length === 0) {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					message: "No fields to complete for this signer",
					path: ["completedFieldIds"],
				},
			]),
		);
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
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					message: "Could not compute completions root",
					path: ["completedFieldIds"],
				},
			]),
		);
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
		throwAppError("SIGNING.SIGNATURE_INVALID");
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
		}) as Promise<unknown>,
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
		requestIp: args.requestIp ?? null,
		requestUserAgent: args.requestUserAgent ?? null,
		createdAt: new Date(timestamp * 1000),
	});

	const now = new Date();
	const snapshotRows: (typeof fileFieldCompletions.$inferInsert)[] = [];

	for (const fieldId of completedFieldIdsStored) {
		const completion = fieldCompletions[fieldId];
		if (!completion) continue;

		let storageKey = completion.storageKey;
		let contentSha256 = completion.contentSha256;
		let sourceArtifactId = completion.sourceArtifactId;

		if (completion.valueKind === "visual" && completion.sourceArtifactId) {
			const [artifact] = await db
				.select()
				.from(userSignatures)
				.where(eq(userSignatures.id, completion.sourceArtifactId));

			if (artifact) {
				const snap = await copyArtifactToEnvelopeSnapshot({
					pieceCid,
					fieldId,
					artifact,
				});
				storageKey = snap.storageKey;
				contentSha256 = snap.contentSha256;
				sourceArtifactId = artifact.id;
			}
		}

		snapshotRows.push({
			filePieceCid: pieceCid,
			fieldId,
			signer: signerWallet,
			valueKind: completion.valueKind,
			sourceArtifactId,
			storageKey,
			contentSha256,
			textValue: completion.textValue,
			createdAt: now,
			updatedAt: now,
		});
	}

	if (snapshotRows.length > 0) {
		await db
			.insert(fileFieldCompletions)
			.values(snapshotRows)
			.onConflictDoNothing();
	}

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

		const { enqueueOutboxByIds, insertJobOutboxRows } = await import(
			"@/lib/platform/jobs"
		);
		const completionOutbox = await buildEnvelopeCompletedEmailOutboxRows({
			pieceCid,
			sender: getAddress(fileRecord.sender),
		});
		if (completionOutbox.length > 0) {
			const inserted = await db.transaction(async (tx) =>
				insertJobOutboxRows(tx, completionOutbox),
			);
			await enqueueOutboxByIds(inserted.map((r) => r.id));
		}

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
