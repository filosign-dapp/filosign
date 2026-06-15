import {
	hashAuthSubjectCommitment,
	hashNormalizedSignerEmail,
	hashOrgIdCommitment,
	normalizePlacementRecipientEmail,
	uniqueSignerEmailsFromManifest,
	zPlacementManifest,
} from "@filosign/shared";
import { eq } from "drizzle-orm";
import { getAddress } from "viem";
import { insertAttachmentPacketsForFile } from "@/lib/domains/attachments";
import { recipientSlotCounts } from "@/lib/domains/entitlements";
import {
	userActivationOnRealEnvelopeSent,
	userActivationRecordPracticePiece,
} from "@/lib/domains/users";
import {
	invalidateEntitlementsForFileSend,
	invalidateNotificationsInbox,
} from "@/lib/platform/cache";
import db from "@/lib/platform/db";
import { fsContracts } from "@/lib/platform/evm";
import { withRegisterPieceLock } from "@/lib/platform/evm/register-piece-lock";
import {
	enqueueFileRegisterRetry,
	enqueueOutboxByIds,
	insertJobOutboxRows,
} from "@/lib/platform/jobs";
import { normalizedViewerEmailsForRegister } from "../invites";
import { zFileRegisterBody } from "./register-body";
import {
	buildRegisterEmailOutboxRows,
	findRegisteredFileByPieceCid,
	type PersistRegisteredFileArgs,
	persistRegisteredFileInTx,
	resolveRegisterRoutingCalldata,
	trackRegisterAnalytics,
} from "./register-helpers";
import { relayRegisterEnvelope } from "./register-relay";
import {
	clearRegisterState,
	getRegisterState,
	markRegisterFailed,
	markRegisteringState,
	parseStoredRegisterRetryPayload,
	setRegisterPendingTxHash,
} from "./register-state";
import { compileRegisterRosterEmails } from "./roster-emails";

/** Call-time schema access so Bun `mock.module("@/lib/platform/db")` stays effective across the shared test module cache. */
function schema() {
	return db.schema;
}

const { FSEnvelopeRegistry } = fsContracts;

export async function executeRegisterJob(pieceCid: string): Promise<void> {
	const existing = await findRegisteredFileByPieceCid(pieceCid);
	if (existing) {
		await clearRegisterState(pieceCid);
		return;
	}

	const state = await getRegisterState(pieceCid);
	if (!state) {
		return;
	}
	if (state.registrationStatus === "registered") {
		await clearRegisterState(pieceCid);
		return;
	}

	const payload = parseStoredRegisterRetryPayload(state.registerPayloadJson);
	if (!payload) {
		await markRegisterFailed(pieceCid, "Invalid stored register payload");
		return;
	}

	const parsedBody = zFileRegisterBody.safeParse(payload.rawBody);
	if (!parsedBody.success) {
		await markRegisterFailed(pieceCid, "Invalid stored register payload");
		return;
	}

	const sender = getAddress(payload.sender);
	const {
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

	const parsedManifest = zPlacementManifest.safeParse(placementManifestRaw);
	if (!parsedManifest.success) {
		await markRegisterFailed(pieceCid, "Invalid placement manifest in payload");
		return;
	}
	const placementManifest = parsedManifest.data;

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
			email: schema().users.email,
			authProviderId: schema().users.authProviderId,
		})
		.from(schema().users)
		.where(eq(schema().users.walletAddress, sender));

	const senderEmailRaw = senderUser?.email?.trim();
	if (!senderEmailRaw) {
		await markRegisterFailed(pieceCid, "Sender email required");
		return;
	}

	const orgIdCommitment = hashOrgIdCommitment(organizationId);
	const senderAuthSubjectCommitment = hashAuthSubjectCommitment(
		senderUser.authProviderId,
	);

	const slotCounts = recipientSlotCounts({ participants, coldInvites });
	const signerSlotCount = Math.max(
		slotCounts.signerSlotCount,
		uniqueSignerEmailsFromManifest(placementManifest).length,
	);

	try {
		await withRegisterPieceLock(pieceCid, async () => {
			const persisted = await findRegisteredFileByPieceCid(pieceCid);
			if (persisted) {
				await clearRegisterState(pieceCid);
				return;
			}

			await markRegisteringState(pieceCid);

			const txHash = await relayRegisterEnvelope({
				pieceCid,
				sender,
				requiredCommitments: routingRequiredCommitments,
				optionalCommitments: optionalCommitmentsSorted,
				viewerEmailCommitments: viewerEmailCommitmentsSorted,
				senderEmailCommitment: hashNormalizedSignerEmail(
					normalizePlacementRecipientEmail(senderEmailRaw),
				),
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
				onBroadcast: async (hash) => {
					await setRegisterPendingTxHash(pieceCid, hash);
				},
			});

			const persistedAfterRelay = await findRegisteredFileByPieceCid(pieceCid);
			if (persistedAfterRelay) {
				await clearRegisterState(pieceCid);
				return;
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
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		await markRegisterFailed(pieceCid, message);
		await enqueueFileRegisterRetry(pieceCid);
	}
}
