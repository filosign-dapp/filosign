import { throwAppError } from "@filosign/errors/server";
import {
	computePlacementCommitment,
	hashAuthSubjectCommitment,
	hashNormalizedSignerEmail,
	hashOrgIdCommitment,
	normalizePlacementRecipientEmail,
	uniqueSignerEmailsFromManifest,
	usesAdvancedRegisterRouting,
	zAttachmentPacketSendInput,
	zEnvelopeMetadata,
	zPlacementManifest,
	zRegisterRoutingInput,
} from "@filosign/shared";
import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import { MAX_FILE_SIZE } from "@/constants";
import { insertAttachmentPacketsForFile } from "@/lib/domains/attachments";
import {
	assertEntitlement,
	recipientSlotCounts,
	resolveEntitlementContext,
} from "@/lib/domains/entitlements";
import { type ActiveOrgContext, assertOrgPermission } from "@/lib/domains/orgs";
import {
	shouldEnforceSendQuota,
	userActivationOnRealEnvelopeSent,
	userActivationRecordPracticePiece,
} from "@/lib/domains/users";
import {
	invalidateEntitlementsForFileSend,
	invalidateNotificationsInbox,
} from "@/lib/platform/cache";
import db from "@/lib/platform/db";
import type { FileRegistrationStatus } from "@/lib/platform/db/schema/file";
import { fsContracts } from "@/lib/platform/evm";
import { withRegisterPieceLock } from "@/lib/platform/evm/register-piece-lock";
import {
	enqueueFileRegisterRetry,
	enqueueOutboxByIds,
	insertJobOutboxRows,
} from "@/lib/platform/jobs";
import { bucket } from "@/lib/platform/s3/client";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";
import { normalizedViewerEmailsForRegister } from "./invites";
import {
	buildRegisterEmailOutboxRows,
	findRegisteredFileByPieceCid,
	type PersistRegisteredFileArgs,
	persistRegisteredFileInTx,
	resolveRegisterRoutingCalldata,
	trackRegisterAnalytics,
} from "./utils/register-helpers";
import { relayRegisterEnvelope } from "./utils/register-relay";
import {
	clearRegisterState,
	markRegisterFailed,
	upsertRegisteringState,
} from "./utils/register-state";
import { compileRegisterRosterEmails } from "./utils/roster-emails";

const { FSEnvelopeRegistry } = fsContracts;

const { users } = db.schema;

export const zFileRegisterBody = z.object({
	pieceCid: z.string({ error: "pieceCid invalid" }),
	participants: z.array(
		z.object({
			address: zEvmAddress(),
			kemCiphertext: zHexString(),
			encryptedEncryptionKey: zHexString(),
			isSigner: z
				.boolean({
					error: "participants[n].isSigner must be boolean",
				})
				.optional(),
		}),
	),
	signature: zHexString(),
	senderEncryptedEncryptionKey: zHexString(),
	senderKemCiphertext: zHexString(),
	timestamp: z.number({ error: "timestamp must be a number" }),
	placementCommitment: zHexString(),
	documentSha256: zHexString(),
	placementManifest: zPlacementManifest,
	coldInvites: z
		.array(
			z.object({
				email: z.email(),
				inviteToken: z.string().min(16),
				wrappedEncryptionKey: zHexString(),
				isSigner: z.boolean(),
			}),
		)
		.optional(),
	organizationId: z.uuid(),
	orgKemCiphertext: zHexString(),
	orgEncryptedEncryptionKey: zHexString(),
	displayName: z.string().min(1).max(512),
	mimeType: z.string().min(1).max(255),
	ciphertextByteLength: z.number().int().positive(),
	routing: zRegisterRoutingInput.optional(),
	attachmentPackets: z.array(zAttachmentPacketSendInput).max(3).optional(),
	isPractice: z.boolean().optional(),
	metadata: zEnvelopeMetadata.optional(),
});

export type FilesRegisterResult = {
	registrationStatus: FileRegistrationStatus;
};

export async function filesRegister(
	sender: Address,
	rawBody: unknown,
	activeOrg: ActiveOrgContext | null = null,
) {
	const parsedBody = zFileRegisterBody.safeParse(rawBody);
	if (parsedBody.error) {
		throwZodBadRequest(parsedBody.error);
	}

	const {
		pieceCid,
		participants,
		signature,
		senderEncryptedEncryptionKey,
		senderKemCiphertext,
		timestamp,
		placementCommitment,
		documentSha256,
		placementManifest: placementManifestRaw,
		coldInvites = [],
		organizationId,
		orgKemCiphertext,
		orgEncryptedEncryptionKey,
		displayName,
		mimeType,
		ciphertextByteLength,
		routing,
		attachmentPackets = [],
		isPractice = false,
		metadata,
	} = parsedBody.data;

	const existing = await findRegisteredFileByPieceCid(pieceCid);
	if (existing) {
		return { registrationStatus: "registered" as const };
	}

	assertOrgPermission(activeOrg, "documents:send");
	if (organizationId !== activeOrg.organizationId) {
		throwAppError("WORKSPACE.ORGANIZATION_MISMATCH");
	}

	const orgIdCommitment = hashOrgIdCommitment(organizationId);

	const parsedManifest = zPlacementManifest.safeParse(placementManifestRaw);
	if (!parsedManifest.success) {
		throwZodBadRequest(parsedManifest.error);
	}
	const placementManifest = parsedManifest.data;
	const derivedCommitment = computePlacementCommitment(placementManifest);
	if (derivedCommitment.toLowerCase() !== placementCommitment.toLowerCase()) {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					message: "placementCommitment does not match manifest",
					path: ["placementCommitment"],
				},
			]),
		);
	}
	if (documentSha256 === `0x${"0".repeat(64)}`) {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					message: "documentSha256 must be non-zero",
					path: ["documentSha256"],
				},
			]),
		);
	}
	const viewerEmails = await normalizedViewerEmailsForRegister({
		participants,
		coldInvites,
	});
	const {
		viewerEmailCommitmentsSorted,
		routingRequiredCommitments,
		optionalCommitmentsSorted,
		routingMode,
		routingOrder,
		quorumN,
		quorumSet,
	} = resolveRegisterRoutingCalldata({
		placementManifest,
		routing,
		viewerEmails,
	});

	const [senderUser] = await db
		.select({
			email: users.email,
			authProviderId: users.authProviderId,
		})
		.from(users)
		.where(eq(users.walletAddress, getAddress(sender)));

	if (!senderUser) {
		throwAppError("AUTH.UNAUTHORIZED");
	}

	const senderEmailRaw = senderUser.email?.trim();
	if (!senderEmailRaw) {
		throwAppError("SIGNING.EMAIL_REQUIRED");
	}
	const senderEmailCommitment = hashNormalizedSignerEmail(
		normalizePlacementRecipientEmail(senderEmailRaw),
	);
	const senderAuthSubjectCommitment = hashAuthSubjectCommitment(
		senderUser.authProviderId,
	);

	const valid = await tryCatch(
		FSEnvelopeRegistry.read.validateEnvelopeRegistrationSignature([
			{
				pieceCid,
				sender,
				requiredCommitments: routingRequiredCommitments,
				optionalCommitments: optionalCommitmentsSorted,
				viewerEmailCommitments: viewerEmailCommitmentsSorted,
				senderEmailCommitment,
				senderAuthSubjectCommitment,
				orgIdCommitment,
				routingMode,
				routingOrder,
				quorumN,
				quorumSet,
				timestamp: BigInt(timestamp),
				signature,
				placementCommitment,
				documentSha256,
			},
		]),
	);

	if (valid.error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: `Error validating signature ${valid.error}`,
		});
	}
	if (!valid.data) {
		throwAppError("SIGNING.SIGNATURE_INVALID");
	}

	const fileExists = await bucket.exists(`uploads/${pieceCid}`);
	if (!fileExists) {
		throwAppError("FILES.UPLOAD_MISSING");
	}

	const file = bucket.file(`uploads/${pieceCid}`);
	if (file.size > MAX_FILE_SIZE) {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					message: "File exceeds maximum allowed size",
					path: ["file"],
				},
			]),
		);
	}

	if (file.size === 0) {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					message: "Uploaded file is empty",
					path: ["file"],
				},
			]),
		);
	}

	const slotCounts = recipientSlotCounts({ participants, coldInvites });
	const signerSlotCount = Math.max(
		slotCounts.signerSlotCount,
		uniqueSignerEmailsFromManifest(placementManifest).length,
	);
	const entitlementCtx = await resolveEntitlementContext(
		getAddress(sender),
		organizationId ?? null,
	);
	if (shouldEnforceSendQuota(isPractice)) {
		assertEntitlement(entitlementCtx, "documents.sent.monthly");
	}
	assertEntitlement(entitlementCtx, "envelope.recipients.max", {
		requested: slotCounts.recipientSlotCount,
	});
	if (usesAdvancedRegisterRouting(routing)) {
		assertEntitlement(entitlementCtx, "features.routing.advanced");
	}

	const retryPayload = {
		sender: getAddress(sender),
		rawBody: parsedBody.data,
		activeOrg,
	};

	try {
		return await withRegisterPieceLock(pieceCid, async () => {
			const persisted = await findRegisteredFileByPieceCid(pieceCid);
			if (persisted) {
				await clearRegisterState(pieceCid);
				return { registrationStatus: "registered" as const };
			}

			await upsertRegisteringState({
				pieceCid,
				sender,
				payload: retryPayload,
			});

			const txHash = await relayRegisterEnvelope({
				pieceCid,
				sender,
				requiredCommitments: routingRequiredCommitments,
				optionalCommitments: optionalCommitmentsSorted,
				viewerEmailCommitments: viewerEmailCommitmentsSorted,
				senderEmailCommitment,
				senderAuthSubjectCommitment,
				orgIdCommitment,
				routingMode,
				routingOrder,
				quorumN,
				quorumSet,
				timestamp,
				signature,
				placementCommitment,
				documentSha256,
			});

			const persistedAfterRelay = await findRegisteredFileByPieceCid(pieceCid);
			if (persistedAfterRelay) {
				await clearRegisterState(pieceCid);
				return { registrationStatus: "registered" as const };
			}

			const persistArgs: PersistRegisteredFileArgs = {
				pieceCid,
				sender,
				organizationId,
				orgKemCiphertext,
				orgEncryptedEncryptionKey,
				onchainTxHash: txHash,
				registryAddress: getAddress(FSEnvelopeRegistry.address),
				placementCommitment,
				documentSha256,
				placementManifest,
				registerRouting: routing,
				warmParticipantCount: slotCounts.warmParticipantCount,
				coldInviteCount: slotCounts.coldInviteCount,
				signerSlotCount,
				recipientSlotCount: slotCounts.recipientSlotCount,
				displayName,
				mimeType,
				ciphertextByteLength,
				timestamp,
				participants,
				senderKemCiphertext,
				senderEncryptedEncryptionKey,
				coldInvites,
				isPractice,
				metadata,
			};

			const participantWallets = [
				...new Set(participants.map((p) => getAddress(p.address))),
			];

			const outboxRows = await db.transaction(async (tx) => {
				await persistRegisteredFileInTx(tx, persistArgs);
				if (isPractice) {
					return [];
				}
				const inserts = await buildRegisterEmailOutboxRows(tx, {
					sender,
					pieceCid,
					documentTitle: displayName,
					participantWallets,
					coldInvites,
				});
				return insertJobOutboxRows(tx, inserts);
			});

			if (!isPractice) {
				await invalidateEntitlementsForFileSend({ sender, organizationId });
				const senderNorm = getAddress(sender);
				await Promise.all(
					participantWallets
						.filter(
							(w) => getAddress(w).toLowerCase() !== senderNorm.toLowerCase(),
						)
						.map((w) => invalidateNotificationsInbox(w)),
				);
			}

			if (outboxRows.length > 0) {
				await enqueueOutboxByIds(outboxRows.map((row) => row.id));
			}

			await insertAttachmentPacketsForFile({
				pieceCid,
				sender,
				organizationId,
				packets: attachmentPackets,
				rosterEmails: await compileRegisterRosterEmails({
					senderEmail: senderEmailRaw,
					participants,
					coldInvites,
				}),
				coldInvites: coldInvites.map((invite) => ({
					email: invite.email,
					inviteToken: invite.inviteToken,
				})),
			});

			if (isPractice) {
				await userActivationRecordPracticePiece(sender, pieceCid);
			} else {
				await userActivationOnRealEnvelopeSent(sender);
				trackRegisterAnalytics({
					sender,
					pieceCid,
					slotCounts: { ...slotCounts, signerSlotCount },
				});
			}

			await clearRegisterState(pieceCid);
			return { registrationStatus: "registered" as const };
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		await markRegisterFailed(pieceCid, message);
		await enqueueFileRegisterRetry(pieceCid);
		throw err;
	}
}
