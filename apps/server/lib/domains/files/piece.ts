import { throwAppError } from "@filosign/errors/server";
import {
	type DocumentViewSource,
	documentViewSources,
	FILE_ACK_INTENT_VERSION_V1,
	hashAuthSubjectCommitment,
	hashNormalizedSignerEmail,
	normalizePlacementRecipientEmail,
} from "@filosign/shared";
import { zHexString } from "@filosign/shared/zod";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import {
	SERVER_ANALYTICS_EVENTS,
	trackServerEvent,
} from "@/lib/platform/analytics";
import db from "@/lib/platform/db";
import { fsEnvelopeRegistryAt } from "@/lib/platform/evm";
import { bucket } from "@/lib/platform/s3/client";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";
import {
	getValidAck,
	requireAckForParticipantAccess,
} from "./utils/piece-helpers";

const {
	files,
	fileAcknowledgements,
	fileParticipants,
	fileDocumentViews,
	users,
} = db.schema;

export const zPieceAckBody = z.object({
	signature: zHexString(),
	timestamp: z.number({ error: "timestamp must be a number" }),
	intentVersion: z.literal(FILE_ACK_INTENT_VERSION_V1).optional(),
});

const zRecordViewBody = z.object({
	source: z.enum(documentViewSources).optional(),
});

/** Stable private object key for the signed-in user's WebP avatar (`storage.presignPut` + `profile.update`). */
export function userAvatarWebpKey(wallet: Address): string {
	return `avatars/${wallet}.webp`;
}

export async function pieceAck(args: {
	userWallet: Address;
	pieceCid: string;
	body: unknown;
	requestIp?: string | null;
	requestUserAgent?: string | null;
}) {
	const parsedBody = zPieceAckBody.safeParse(args.body);
	if (parsedBody.error) {
		throwZodBadRequest(parsedBody.error);
	}
	const { signature, timestamp } = parsedBody.data;
	const intentVersion =
		parsedBody.data.intentVersion ?? FILE_ACK_INTENT_VERSION_V1;

	const [fileRecord] = await db
		.select({
			pieceCid: files.pieceCid,
			sender: files.sender,
			registryAddress: files.registryAddress,
			revokedBeforeCompletedAt: files.revokedBeforeCompletedAt,
			completedAt: files.completedAt,
		})
		.from(files)
		.where(eq(files.pieceCid, args.pieceCid));

	if (!fileRecord) {
		throwAppError("FILES.NOT_FOUND");
	}
	if (fileRecord.revokedBeforeCompletedAt) {
		throwAppError("FILES.ENVELOPE_VOIDED");
	}
	if (fileRecord.completedAt) {
		throwAppError("FILES.ENVELOPE_COMPLETE");
	}

	const [participantRecord] = await db
		.select({
			wallet: fileParticipants.wallet,
			email: users.email,
			authProviderId: users.authProviderId,
		})
		.from(fileParticipants)
		.innerJoin(users, eq(fileParticipants.wallet, users.walletAddress))
		.where(
			and(
				eq(fileParticipants.filePieceCid, fileRecord.pieceCid),
				eq(fileParticipants.wallet, args.userWallet),
			),
		);
	if (!participantRecord) {
		throwAppError("FILES.FORBIDDEN");
	}

	const existingAck = await getValidAck(args.userWallet, args.pieceCid);
	if (existingAck) {
		throwAppError("FILES.ALREADY_ACKED");
	}

	const viewerAckEmailRaw = participantRecord.email?.trim();
	if (!viewerAckEmailRaw) {
		throwAppError("SIGNING.EMAIL_REQUIRED");
	}
	const viewerAckEmail = normalizePlacementRecipientEmail(viewerAckEmailRaw);
	const viewerEmailCommitment = hashNormalizedSignerEmail(viewerAckEmail);
	const authSubjectCommitment = hashAuthSubjectCommitment(
		participantRecord.authProviderId,
	);

	const registry = fsEnvelopeRegistryAt(fileRecord.registryAddress);

	const valid = await registry.read.validateEnvelopeAckSignature([
		args.pieceCid,
		fileRecord.sender,
		participantRecord.wallet,
		viewerEmailCommitment,
		authSubjectCommitment,
		BigInt(timestamp),
		signature,
	]);

	if (!valid) {
		throwAppError("SIGNING.SIGNATURE_INVALID");
	}
	const walletNorm = getAddress(participantRecord.wallet);
	const acknowledgedAt = new Date(timestamp * 1000);
	const now = new Date();

	const inserted = await db
		.insert(fileAcknowledgements)
		.values({
			filePieceCid: fileRecord.pieceCid,
			wallet: walletNorm,
			ack: signature,
			acknowledgedAt,
			intentVersion,
			requestIp: args.requestIp ?? null,
			requestUserAgent: args.requestUserAgent ?? null,
			createdAt: acknowledgedAt,
			updatedAt: now,
		})
		.onConflictDoNothing({
			target: [fileAcknowledgements.filePieceCid, fileAcknowledgements.wallet],
		})
		.returning({ filePieceCid: fileAcknowledgements.filePieceCid });

	if (inserted.length === 0) {
		const existing = await getValidAck(args.userWallet, args.pieceCid);
		if (existing && existing.ack.toLowerCase() === signature.toLowerCase()) {
			return {};
		}
		throwAppError("FILES.ALREADY_ACKED");
	}

	trackServerEvent({
		distinctId: walletNorm,
		event: SERVER_ANALYTICS_EVENTS.pieceAcknowledged,
		pieceCid: args.pieceCid,
		properties: { intent_version: intentVersion },
	});

	return {};
}

export async function pieceDownloadUrl(userWallet: Address, pieceCid: string) {
	const parsedPieceCid = z
		.string()
		.min(1, "Invalid pieceCid")
		.safeParse(pieceCid);
	if (parsedPieceCid.error) {
		throwZodBadRequest(parsedPieceCid.error);
	}
	const cleanPieceCid = parsedPieceCid.data;

	const userWalletNorm = getAddress(userWallet);

	const [fileRecord] = await db
		.select({
			pieceCid: files.pieceCid,
			sender: files.sender,
			organizationId: files.organizationId,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid));

	if (!fileRecord) {
		throwAppError("FILES.NOT_FOUND");
	}

	const isSender = getAddress(fileRecord.sender) === userWalletNorm;

	const [participantRecord] = await db
		.select({
			wallet: fileParticipants.wallet,
		})
		.from(fileParticipants)
		.where(
			and(
				eq(fileParticipants.filePieceCid, fileRecord.pieceCid),
				eq(fileParticipants.wallet, userWalletNorm),
			),
		);

	const orgRead =
		!participantRecord &&
		fileRecord.organizationId &&
		(await getOrgMemberWithDocumentRead(
			userWalletNorm,
			fileRecord.organizationId,
		));

	if (!participantRecord && !orgRead) {
		throwAppError("FILES.FORBIDDEN");
	}

	if (participantRecord && !isSender) {
		await requireAckForParticipantAccess(userWalletNorm, cleanPieceCid);
	}

	const fileExists = await bucket.exists(`uploads/${cleanPieceCid}`);

	if (!fileExists) {
		throwAppError("FILES.NOT_FOUND");
	}

	const presignedUrl = bucket.presign(`uploads/${cleanPieceCid}`, {
		method: "GET",
		expiresIn: 60 * 5,
	});

	return { presignedUrl };
}

// Stub function to prevent direct imports error for getOrgMemberWithDocumentRead inside pieceDownloadUrl
async function getOrgMemberWithDocumentRead(
	userWallet: Address,
	organizationId: string,
) {
	const orgMod = await import("@/lib/domains/orgs");
	return orgMod.getOrgMemberWithDocumentRead(userWallet, organizationId);
}

export async function pieceRecordView(args: {
	userWallet: Address;
	pieceCid: string;
	body: unknown;
}) {
	const parsedBody = zRecordViewBody.safeParse(args.body ?? {});
	if (parsedBody.error) {
		throwZodBadRequest(parsedBody.error);
	}
	const source: DocumentViewSource = parsedBody.data.source ?? "sign_page";
	const walletNorm = getAddress(args.userWallet);

	const [participantRecord] = await db
		.select({ wallet: fileParticipants.wallet })
		.from(fileParticipants)
		.where(
			and(
				eq(fileParticipants.filePieceCid, args.pieceCid),
				eq(fileParticipants.wallet, walletNorm),
			),
		);
	if (!participantRecord) {
		throwAppError("FILES.FORBIDDEN");
	}

	await requireAckForParticipantAccess(walletNorm, args.pieceCid);

	const [existing] = await db
		.select({
			firstViewedAt: fileDocumentViews.firstViewedAt,
			source: fileDocumentViews.source,
		})
		.from(fileDocumentViews)
		.where(
			and(
				eq(fileDocumentViews.filePieceCid, args.pieceCid),
				eq(fileDocumentViews.wallet, walletNorm),
			),
		);

	if (existing) {
		return {
			firstViewedAt: existing.firstViewedAt.toISOString(),
			source: existing.source,
		};
	}

	const now = new Date();
	await db.insert(fileDocumentViews).values({
		filePieceCid: args.pieceCid,
		wallet: walletNorm,
		firstViewedAt: now,
		source,
		createdAt: now,
		updatedAt: now,
	});

	return {
		firstViewedAt: now.toISOString(),
		source,
	};
}
