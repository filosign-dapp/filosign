import { throwAppError } from "@filosign/errors/server";
import {
	computePlacementCommitment,
	hashAuthSubjectCommitment,
	hashNormalizedSignerEmail,
	hashOrgIdCommitment,
	normalizePlacementRecipientEmail,
	usesAdvancedRegisterRouting,
	zAttachmentPacketSendInput,
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
import { invalidateEntitlementsForFileSend } from "@/lib/platform/cache";
import db from "@/lib/platform/db";
import { fsContracts } from "@/lib/platform/evm";
import { withRegistryWalletLock } from "@/lib/platform/evm/registry-wallet-lock";
import { withRelayerLock } from "@/lib/platform/evm/relayer-lock";
import { enqueueOutboxByIds, insertJobOutboxRows } from "@/lib/platform/jobs";
import { bucket } from "@/lib/platform/s3/client";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { normalizedViewerEmailsForRegister } from "./invites";
import {
	buildRegisterEmailOutboxRows,
	type PersistRegisteredFileArgs,
	persistRegisteredFileInTx,
	resolveRegisterRoutingCalldata,
	trackRegisterAnalytics,
} from "./utils/register-helpers";

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
	organizationId: z.uuid(),
	orgKemCiphertext: zHexString(),
	orgEncryptedEncryptionKey: zHexString(),
	displayName: z.string().min(1).max(512),
	mimeType: z.string().min(1).max(255),
	ciphertextByteLength: z.number().int().positive(),
	routing: zRegisterRoutingInput.optional(),
	attachmentPackets: z.array(zAttachmentPacketSendInput).max(3).optional(),
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
		displayName,
		mimeType,
		ciphertextByteLength,
		routing,
		attachmentPackets = [],
	} = parsedBody.data;

	assertOrgPermission(activeOrg, "documents:send");
	if (organizationId !== activeOrg.organizationId) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"organizationId in request body must match X-Org-Id header context",
		});
	}

	const orgIdCommitment = hashOrgIdCommitment(organizationId);

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
			},
		]),
	);

	if (valid.error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: `Error validating signature ${valid.error}`,
		});
	}
	if (!valid.data) {
		throwAppError("SIGNING.SIGNATURE_INVALID");
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
	if (usesAdvancedRegisterRouting(routing)) {
		assertEntitlement(entitlementCtx, "features.routing.advanced");
	}

	const txHash = await withRelayerLock(() =>
		withRegistryWalletLock(sender, () =>
			FSEnvelopeRegistry.write.registerEnvelope([
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
				},
			]),
		),
	);

	const persistArgs: PersistRegisteredFileArgs = {
		pieceCid,
		sender,
		organizationId,
		orgKemCiphertext,
		orgEncryptedEncryptionKey,
		onchainTxHash: txHash,
		registryAddress: getAddress(FSEnvelopeRegistry.address),
		placementCommitment,
		placementManifest,
		registerRouting: routing,
		warmParticipantCount: slotCounts.warmParticipantCount,
		coldInviteCount: slotCounts.coldInviteCount,
		signerSlotCount: slotCounts.signerSlotCount,
		recipientSlotCount: slotCounts.recipientSlotCount,
		displayName,
		mimeType,
		ciphertextByteLength,
		timestamp,
		participants,
		senderKemCiphertext,
		senderEncryptedEncryptionKey,
		coldInvites,
	};

	const participantWallets = [
		...new Set(participants.map((p) => getAddress(p.address))),
	];

	const outboxRows = await db.transaction(async (tx) => {
		await persistRegisteredFileInTx(tx, persistArgs);
		const inserts = await buildRegisterEmailOutboxRows(tx, {
			sender,
			pieceCid,
			participantWallets,
			coldInvites,
		});
		return insertJobOutboxRows(tx, inserts);
	});

	await invalidateEntitlementsForFileSend({ sender, organizationId });

	await enqueueOutboxByIds(outboxRows.map((row) => row.id));

	await insertAttachmentPacketsForFile({
		pieceCid,
		sender,
		organizationId,
		packets: attachmentPackets,
		coldInviteToken: coldInvites[0]?.inviteToken,
	});

	trackRegisterAnalytics({ sender, pieceCid, slotCounts });

	return {};
}
