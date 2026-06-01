import { type DocumentViewSource, documentViewSources } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import { requireAckForParticipantAccess } from "@/lib/domains/files/utils/participant-access";
import { SERVER_ANALYTICS_EVENTS } from "@/lib/platform/analytics/events";
import { trackServerEvent } from "@/lib/platform/analytics/track";
import db from "@/lib/platform/db";
import { zodSafeParseMessage } from "@/lib/platform/utils/zodHttp";

export { pieceComplianceBundle } from "./utils/piece-compliance";
export { pieceDetail } from "./utils/piece-detail";

const { fileDocumentViews, fileParticipants } = db.schema;

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
