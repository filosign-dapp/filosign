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
import { fsEnvelopeRegistryAt } from "@/lib/platform/evm";
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
