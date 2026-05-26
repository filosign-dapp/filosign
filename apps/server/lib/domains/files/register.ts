import {
	buildRegistrationEmailCommitments,
	computePlacementCommitment,
	hashAuthSubjectCommitment,
	hashNormalizedSignerEmail,
	hashOrgIdCommitment,
	normalizePlacementRecipientEmail,
	ZERO_ORG_ID_COMMITMENT,
	zPlacementManifest,
} from "@filosign/shared";
import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { eq, inArray } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import { MAX_FILE_SIZE } from "@/constants";
import {
	assertEntitlement,
	recipientSlotCounts,
	resolveEntitlementContext,
} from "@/lib/domains/entitlements";
import { inviteExpiresAt } from "@/lib/domains/invites";
import { type ActiveOrgContext, assertOrgPermission } from "@/lib/domains/orgs";
import {
	assertSettlementRecipientsAllowlisted,
	assertSettlementRulesVerifiedOnChain,
	insertSettlementRulesForFile,
	zSettlementRulesRegisterBatch,
} from "@/lib/domains/settlements";
import { SERVER_ANALYTICS_EVENTS } from "@/lib/platform/analytics/events";
import { trackServerEvent } from "@/lib/platform/analytics/track";
import db from "@/lib/platform/db";
import {
	sendColdDocumentInviteEmail,
	sendDocumentReceivedEmail,
} from "@/lib/platform/email/invites";
import { fsContracts } from "@/lib/platform/evm";
import { bucket } from "@/lib/platform/s3/client";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { normalizedViewerEmailsForRegister } from "./file-invites";

const { FSFileRegistry } = fsContracts;

const { files, fileParticipants, fileColdInvites, users } = db.schema;

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
	placementManifest: z.unknown(),
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
	organizationId: z.uuid().optional(),
	orgKemCiphertext: zHexString().optional(),
	orgEncryptedEncryptionKey: zHexString().optional(),
	settlementRules: zSettlementRulesRegisterBatch.optional(),
	displayName: z.string().min(1).max(512),
	mimeType: z.string().min(1).max(255),
	ciphertextByteLength: z.number().int().positive(),
});

export async function filesRegister(
	sender: Address,
	rawBody: unknown,
	activeOrg: ActiveOrgContext | null = null,
) {
	const parsedBody = zFileRegisterBody.safeParse(rawBody);
	if (parsedBody.error) {
		throw new ORPCError("BAD_REQUEST", { message: parsedBody.error.message });
	}

	const {
		pieceCid,
		participants,
		signature,
		senderEncryptedEncryptionKey,
		senderKemCiphertext,
		timestamp,
		placementCommitment,
		placementManifest: placementManifestRaw,
		coldInvites = [],
		organizationId,
		orgKemCiphertext,
		orgEncryptedEncryptionKey,
		settlementRules = [],
		displayName,
		mimeType,
		ciphertextByteLength,
	} = parsedBody.data;

	if (organizationId) {
		if (!activeOrg || activeOrg.organizationId !== organizationId) {
			throw new ORPCError("FORBIDDEN", {
				message: "Organization context required for org send",
			});
		}
		assertOrgPermission(activeOrg, "documents:send");
		if (!orgKemCiphertext || !orgEncryptedEncryptionKey) {
			throw new ORPCError("BAD_REQUEST", {
				message:
					"Org send requires orgKemCiphertext and orgEncryptedEncryptionKey",
			});
		}
	}

	const orgIdCommitment = organizationId
		? hashOrgIdCommitment(organizationId)
		: ZERO_ORG_ID_COMMITMENT;

	const parsedManifest = zPlacementManifest.safeParse(placementManifestRaw);
	if (!parsedManifest.success) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Invalid placement manifest",
		});
	}
	const placementManifest = parsedManifest.data;
	const derivedCommitment = computePlacementCommitment(placementManifest);
	if (derivedCommitment.toLowerCase() !== placementCommitment.toLowerCase()) {
		throw new ORPCError("BAD_REQUEST", {
			message: "placementCommitment does not match manifest",
		});
	}
	const viewerEmails = await normalizedViewerEmailsForRegister({
		participants,
		coldInvites,
	});
	const { signerEmailCommitmentsSorted, viewerEmailCommitmentsSorted } =
		buildRegistrationEmailCommitments({
			placementManifest,
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
		throw new ORPCError("NOT_FOUND", { message: "User not found" });
	}

	const senderEmailRaw = senderUser.email?.trim();
	if (!senderEmailRaw) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Add a primary email to your profile before sending documents",
		});
	}
	const senderEmailCommitment = hashNormalizedSignerEmail(
		normalizePlacementRecipientEmail(senderEmailRaw),
	);
	const senderPrivySubjectCommitment = hashAuthSubjectCommitment(
		senderUser.authProviderId,
	);

	const valid = await tryCatch(
		FSFileRegistry.read.validateFileRegistrationSignature([
			pieceCid,
			sender,
			signerEmailCommitmentsSorted,
			viewerEmailCommitmentsSorted,
			senderEmailCommitment,
			senderPrivySubjectCommitment,
			orgIdCommitment,
			BigInt(timestamp),
			signature,
			placementCommitment,
		]),
	);

	if (valid.error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: `Error validating signature ${valid.error}`,
		});
	}
	if (!valid.data) {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid signature" });
	}

	const fileExists = await bucket.exists(`uploads/${pieceCid}`);
	if (!fileExists) {
		throw new ORPCError("BAD_REQUEST", {
			message: "File not found on storage",
		});
	}

	const file = bucket.file(`uploads/${pieceCid}`);
	if (file.size > MAX_FILE_SIZE) {
		throw new ORPCError("PAYLOAD_TOO_LARGE", {
			message: "File exceeds maximum allowed size",
		});
	}

	if (file.size === 0) {
		throw new ORPCError("BAD_REQUEST", { message: "Uploaded file is empty" });
	}

	const slotCounts = recipientSlotCounts({ participants, coldInvites });
	const entitlementCtx = await resolveEntitlementContext(
		getAddress(sender),
		organizationId ?? null,
	);
	assertEntitlement(entitlementCtx, "documents.sent.monthly");
	assertEntitlement(entitlementCtx, "envelope.recipients.max", {
		requested: slotCounts.recipientSlotCount,
	});

	const txHash = await FSFileRegistry.write.registerFile([
		pieceCid,
		sender,
		signerEmailCommitmentsSorted,
		viewerEmailCommitmentsSorted,
		senderEmailCommitment,
		senderPrivySubjectCommitment,
		orgIdCommitment,
		BigInt(timestamp),
		signature,
		placementCommitment,
	]);

	if (settlementRules.length > 0) {
		await assertSettlementRecipientsAllowlisted({
			participantWallets: participants.map((p) => getAddress(p.address)),
			organizationId,
			rules: settlementRules,
		});
		await assertSettlementRulesVerifiedOnChain(
			getAddress(sender),
			pieceCid,
			settlementRules,
		);
	}

	await db.transaction(async (tx) => {
		await tx
			.insert(files)
			.values({
				pieceCid,
				status: "s3",
				sender,
				createdByWallet: getAddress(sender),
				organizationId: organizationId ?? null,
				orgKemCiphertext: orgKemCiphertext ?? null,
				orgEncryptedEncryptionKey: orgEncryptedEncryptionKey ?? null,
				onchainTxHash: txHash,
				placementCommitment,
				placementManifestJson: placementManifest,
				warmParticipantCount: slotCounts.warmParticipantCount,
				coldInviteCount: slotCounts.coldInviteCount,
				signerSlotCount: slotCounts.signerSlotCount,
				recipientSlotCount: slotCounts.recipientSlotCount,
				displayName,
				mimeType,
				ciphertextByteLength,
				createdAt: new Date(timestamp * 1000),
			})
			.returning();
		await tx.insert(fileParticipants).values([
			{
				filePieceCid: pieceCid,
				wallet: getAddress(sender),
				role: "sender",
				kemCiphertext: senderKemCiphertext,
				encryptedEncryptionKey: senderEncryptedEncryptionKey,
			},
			...participants.map((p) => ({
				filePieceCid: pieceCid,
				wallet: getAddress(p.address),
				role: p.isSigner ? ("signer" as const) : ("viewer" as const),
				kemCiphertext: p.kemCiphertext,
				encryptedEncryptionKey: p.encryptedEncryptionKey,
			})),
		]);

		if (coldInvites.length > 0) {
			await tx.insert(fileColdInvites).values(
				coldInvites.map((c) => ({
					filePieceCid: pieceCid,
					email: c.email.trim().toLowerCase(),
					inviteToken: c.inviteToken,
					wrappedEncryptionKey: c.wrappedEncryptionKey,
					isSigner: c.isSigner,
					status: "pending" as const,
					expiresAt: inviteExpiresAt(),
				})),
			);
		}

		await insertSettlementRulesForFile(
			pieceCid,
			getAddress(sender),
			settlementRules,
			tx,
		);
	});

	const participantWallets = [
		...new Set(participants.map((p) => getAddress(p.address))),
	];
	const participantProfiles = participantWallets.length
		? await db
				.select({
					walletAddress: users.walletAddress,
					email: users.email,
				})
				.from(users)
				.where(inArray(users.walletAddress, participantWallets))
		: [];
	const [senderProfile] = await db
		.select({
			email: users.email,
			firstName: users.firstName,
			lastName: users.lastName,
			username: users.username,
		})
		.from(users)
		.where(eq(users.walletAddress, sender));
	const senderName =
		[senderProfile?.firstName, senderProfile?.lastName]
			.filter(Boolean)
			.join(" ") ||
		senderProfile?.username ||
		senderProfile?.email ||
		undefined;

	const emailResults = await Promise.all(
		participantProfiles
			.filter((profile) => profile.email)
			.map((profile) =>
				tryCatch(
					sendDocumentReceivedEmail({
						to: profile.email as string,
						senderWallet: sender as Address,
						pieceCid,
						senderName,
					}),
				),
			),
	);
	const emailFailures = emailResults.filter((result) => result.error);
	if (emailFailures.length > 0) {
		console.error("Failed to send document notification emails", {
			pieceCid,
			failedCount: emailFailures.length,
			errors: emailFailures.map((result) => result.error?.message),
		});
	}

	const coldEmailResults = await Promise.all(
		coldInvites.map((c) =>
			tryCatch(
				sendColdDocumentInviteEmail({
					to: c.email.trim().toLowerCase(),
					pieceCid,
					inviteToken: c.inviteToken,
					senderWallet: sender as Address,
					senderName,
				}),
			),
		),
	);
	const coldEmailFailures = coldEmailResults.filter((r) => r.error);
	if (coldEmailFailures.length > 0) {
		console.error("Failed to send cold invite emails", {
			pieceCid,
			failedCount: coldEmailFailures.length,
			errors: coldEmailFailures.map((r) => r.error?.message),
		});
	}

	trackServerEvent({
		distinctId: getAddress(sender),
		event: SERVER_ANALYTICS_EVENTS.fileRegistered,
		pieceCid,
		properties: {
			signer_count: slotCounts.signerSlotCount,
			cold_invite_count: slotCounts.coldInviteCount,
			warm_participant_count: slotCounts.warmParticipantCount,
			recipient_slot_count: slotCounts.recipientSlotCount,
		},
	});
	if (slotCounts.coldInviteCount > 0) {
		trackServerEvent({
			distinctId: getAddress(sender),
			event: SERVER_ANALYTICS_EVENTS.coldInviteCreated,
			pieceCid,
			properties: { cold_invite_count: slotCounts.coldInviteCount },
		});
	}

	return {};
}
