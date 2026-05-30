import {
	type DocumentViewSource,
	documentViewSources,
	FILE_ACK_INTENT_VERSION_V1,
	hashAuthSubjectCommitment,
	hashNormalizedSignerEmail,
	normalizePlacementRecipientEmail,
	zPlacementManifest,
} from "@filosign/shared";
import { zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import { primaryEmailForWallet } from "@/lib/domains/files/file-invites";
import {
	getValidAck,
	requireAckForParticipantAccess,
} from "@/lib/domains/files/utils/participant-access";
import { getOrgMemberWithDocumentRead } from "@/lib/domains/orgs";
import { SERVER_ANALYTICS_EVENTS } from "@/lib/platform/analytics/events";
import { trackServerEvent } from "@/lib/platform/analytics/track";
import db from "@/lib/platform/db";
import { fsFileRegistryAt } from "@/lib/platform/evm";
import { bucket } from "@/lib/platform/s3/client";
import { zodSafeParseMessage } from "@/lib/platform/utils/zodHttp";

export { pieceComplianceBundle } from "./utils/piece-compliance";
export { pieceDetail } from "./utils/piece-detail";

const {
	files,
	fileAcknowledgements,
	fileDocumentViews,
	fileParticipants,
	fileSignerDrafts,
	users,
} = db.schema;

const zPieceAckBody = z.object({
	signature: zHexString(),
	timestamp: z.number({ error: "timestamp must be a number" }),
	intentVersion: z.literal(FILE_ACK_INTENT_VERSION_V1).optional(),
});

export async function pieceAck(args: {
	userWallet: Address;
	pieceCid: string;
	body: unknown;
	requestIp?: string | null;
	requestUserAgent?: string | null;
}) {
	const parsedBody = zPieceAckBody.safeParse(args.body);
	if (parsedBody.error) {
		throw new ORPCError("BAD_REQUEST", {
			message: zodSafeParseMessage(parsedBody.error),
		});
	}
	const { signature, timestamp } = parsedBody.data;
	const intentVersion =
		parsedBody.data.intentVersion ?? FILE_ACK_INTENT_VERSION_V1;

	const [fileRecord] = await db
		.select({
			pieceCid: files.pieceCid,
			sender: files.sender,
			registryAddress: files.registryAddress,
		})
		.from(files)
		.where(eq(files.pieceCid, args.pieceCid));

	if (!fileRecord) {
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
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
		throw new ORPCError("NOT_FOUND", {
			message: "you are nto Participant in thies file",
		});
	}

	const existingAck = await getValidAck(args.userWallet, args.pieceCid);
	if (existingAck) {
		throw new ORPCError("CONFLICT", { message: "File already acked" });
	}

	const viewerAckEmailRaw = participantRecord.email?.trim();
	if (!viewerAckEmailRaw) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Profile email required to acknowledge",
		});
	}
	const viewerAckEmail = normalizePlacementRecipientEmail(viewerAckEmailRaw);
	const viewerEmailCommitment = hashNormalizedSignerEmail(viewerAckEmail);
	const privySubjectCommitment = hashAuthSubjectCommitment(
		participantRecord.authProviderId,
	);

	const registry = fsFileRegistryAt(fileRecord.registryAddress);

	const valid = await registry.read.validateFileAckSignature([
		args.pieceCid,
		fileRecord.sender,
		participantRecord.wallet,
		viewerEmailCommitment,
		privySubjectCommitment,
		BigInt(timestamp),
		signature,
	]);

	if (!valid) {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid signature" });
	}
	const walletNorm = getAddress(participantRecord.wallet);
	const acknowledgedAt = new Date(timestamp * 1000);
	const now = new Date();

	await db.insert(fileAcknowledgements).values({
		filePieceCid: fileRecord.pieceCid,
		wallet: walletNorm,
		ack: signature,
		acknowledgedAt,
		intentVersion,
		requestIp: args.requestIp ?? null,
		requestUserAgent: args.requestUserAgent ?? null,
		createdAt: acknowledgedAt,
		updatedAt: now,
	});

	trackServerEvent({
		distinctId: walletNorm,
		event: SERVER_ANALYTICS_EVENTS.pieceAcknowledged,
		pieceCid: args.pieceCid,
		properties: { intent_version: intentVersion },
	});

	return {};
}

const zRecordViewBody = z.object({
	source: z.enum(documentViewSources).optional(),
});

export async function pieceRecordView(args: {
	userWallet: Address;
	pieceCid: string;
	body: unknown;
}) {
	const parsedBody = zRecordViewBody.safeParse(args.body ?? {});
	if (parsedBody.error) {
		throw new ORPCError("BAD_REQUEST", {
			message: zodSafeParseMessage(parsedBody.error),
		});
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
		throw new ORPCError("FORBIDDEN", {
			message: "You dont have access to this file",
		});
	}

	await requireAckForParticipantAccess(walletNorm, args.pieceCid);

	const now = new Date();
	const [existing] = await db
		.select({ viewCount: fileDocumentViews.viewCount })
		.from(fileDocumentViews)
		.where(
			and(
				eq(fileDocumentViews.filePieceCid, args.pieceCid),
				eq(fileDocumentViews.wallet, walletNorm),
			),
		);

	if (existing) {
		await db
			.update(fileDocumentViews)
			.set({
				lastViewedAt: now,
				viewCount: existing.viewCount + 1,
				source,
				updatedAt: now,
			})
			.where(
				and(
					eq(fileDocumentViews.filePieceCid, args.pieceCid),
					eq(fileDocumentViews.wallet, walletNorm),
				),
			);
	} else {
		await db.insert(fileDocumentViews).values({
			filePieceCid: args.pieceCid,
			wallet: walletNorm,
			firstViewedAt: now,
			lastViewedAt: now,
			viewCount: 1,
			source,
			createdAt: now,
			updatedAt: now,
		});
		trackServerEvent({
			distinctId: walletNorm,
			event: SERVER_ANALYTICS_EVENTS.documentViewed,
			pieceCid: args.pieceCid,
			properties: { source },
		});
	}

	const view = await db
		.select({
			firstViewedAt: fileDocumentViews.firstViewedAt,
			lastViewedAt: fileDocumentViews.lastViewedAt,
			viewCount: fileDocumentViews.viewCount,
		})
		.from(fileDocumentViews)
		.where(
			and(
				eq(fileDocumentViews.filePieceCid, args.pieceCid),
				eq(fileDocumentViews.wallet, walletNorm),
			),
		);

	const row = view[0];
	if (!row) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to record document view",
		});
	}

	return {
		firstViewedAt: row.firstViewedAt.toISOString(),
		lastViewedAt: row.lastViewedAt.toISOString(),
		viewCount: row.viewCount,
	};
}

/** --- draft --- */

export async function pieceSignDraftGet(userWallet: Address, pieceCid: string) {
	const [fileRecord] = await db
		.select({
			placementManifestJson: files.placementManifestJson,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid));

	const [participantRecord] = await db
		.select({ wallet: fileParticipants.wallet })
		.from(fileParticipants)
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

	await requireAckForParticipantAccess(userWallet, pieceCid);

	const manifestParsed = zPlacementManifest.safeParse(
		fileRecord.placementManifestJson,
	);
	if (!manifestParsed.success) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "File placement manifest missing or invalid",
		});
	}

	const signerEmail = await primaryEmailForWallet(participantRecord.wallet);
	if (!signerEmail) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"Add a primary email to your Filosign profile to use placement drafts",
		});
	}
	const allowedIds = new Set(
		manifestParsed.data.fields
			.filter((f) => f.assignedRecipientEmail === signerEmail)
			.map((f) => f.id),
	);

	const [draft] = await db
		.select({ completedFieldIds: fileSignerDrafts.completedFieldIds })
		.from(fileSignerDrafts)
		.where(
			and(
				eq(fileSignerDrafts.filePieceCid, pieceCid),
				eq(fileSignerDrafts.wallet, participantRecord.wallet),
			),
		);

	const stored = draft?.completedFieldIds ?? [];
	const completedFieldIds = stored.filter((id) => allowedIds.has(id));

	return { completedFieldIds };
}

const zSignDraftPutBody = z.object({
	completedFieldIds: z.array(z.string()),
});

export async function pieceSignDraftPut(args: {
	userWallet: Address;
	pieceCid: string;
	body: unknown;
}) {
	const parsedBody = zSignDraftPutBody.safeParse(args.body);
	if (parsedBody.error) {
		throw new ORPCError("BAD_REQUEST", {
			message: zodSafeParseMessage(parsedBody.error),
		});
	}
	const { completedFieldIds: bodyIds } = parsedBody.data;
	const pieceCid = args.pieceCid;
	const userWallet = args.userWallet;

	await requireAckForParticipantAccess(userWallet, pieceCid);

	const [fileRecord] = await db
		.select({
			placementManifestJson: files.placementManifestJson,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid));

	const [participantRecord] = await db
		.select({ wallet: fileParticipants.wallet })
		.from(fileParticipants)
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

	const signerEmail = await primaryEmailForWallet(participantRecord.wallet);
	if (!signerEmail) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"Add a primary email to your Filosign profile to use placement drafts",
		});
	}
	const allowedIds = new Set(
		manifestParsed.data.fields
			.filter((f) => f.assignedRecipientEmail === signerEmail)
			.map((f) => f.id),
	);

	for (const id of bodyIds) {
		if (!allowedIds.has(id)) {
			throw new ORPCError("BAD_REQUEST", {
				message: "completedFieldIds must match manifest fields for signer",
			});
		}
	}

	const completedFieldIds = [...new Set(bodyIds)];
	const now = new Date();

	await db
		.insert(fileSignerDrafts)
		.values({
			filePieceCid: pieceCid,
			wallet: participantRecord.wallet,
			completedFieldIds,
			createdAt: now,
			updatedAt: now,
		})
		.onConflictDoUpdate({
			target: [fileSignerDrafts.filePieceCid, fileSignerDrafts.wallet],
			set: {
				completedFieldIds,
				updatedAt: now,
			},
		});

	return { completedFieldIds };
}

/** --- s3 --- */

export async function pieceDownloadUrl(userWallet: Address, pieceCid: string) {
	if (!pieceCid || typeof pieceCid !== "string") {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid pieceCid" });
	}

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
		throw new ORPCError("NOT_FOUND", {
			message: "File not found or not allowed to access",
		});
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
		throw new ORPCError("NOT_FOUND", {
			message: "File not found or not allowed to access",
		});
	}

	if (participantRecord && !isSender) {
		await requireAckForParticipantAccess(userWalletNorm, pieceCid);
	}

	const fileExists = await bucket.exists(`uploads/${pieceCid}`);

	if (!fileExists) {
		throw new ORPCError("NOT_FOUND", { message: "File not found on S3" });
	}

	const presignedUrl = bucket.presign(`uploads/${pieceCid}`, {
		method: "GET",
		expiresIn: 60 * 5,
	});

	return { presignedUrl };
}
