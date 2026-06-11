import { throwAppError } from "@filosign/errors/server";
import { and, eq, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import db from "@/lib/platform/db";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";
import { pendingDraftShareFilter } from "./external-share-filters";

const { draftComments, draftExternalShares, users } = db.schema;

export const MAX_DRAFT_COMMENT_CIPHERTEXT_HEX = 32_768;
export const MAX_DRAFT_COMMENTS_PER_DRAFT = 500;

export type DraftCommentRow = {
	id: string;
	authorWallet: string | null;
	inviteToken: string | null;
	ciphertext: string;
	createdAt: Date;
	authorEmail: string | null;
	authorFirstName: string | null;
	authorLastName: string | null;
	shareEmail: string | null;
};

export async function selectDraftCommentsForDraft(
	draftId: string,
): Promise<DraftCommentRow[]> {
	return db
		.select({
			id: draftComments.id,
			authorWallet: draftComments.authorWallet,
			inviteToken: draftComments.inviteToken,
			ciphertext: draftComments.ciphertext,
			createdAt: draftComments.createdAt,
			authorEmail: users.email,
			authorFirstName: users.firstName,
			authorLastName: users.lastName,
			shareEmail: draftExternalShares.email,
		})
		.from(draftComments)
		.leftJoin(users, eq(draftComments.authorWallet, users.walletAddress))
		.leftJoin(
			draftExternalShares,
			and(
				eq(draftComments.inviteToken, draftExternalShares.inviteToken),
				eq(draftExternalShares.draftId, draftId),
			),
		)
		.where(eq(draftComments.draftId, draftId))
		.orderBy(draftComments.createdAt);
}

export function mapDraftCommentResponse(row: DraftCommentRow) {
	const nameParts = [row.authorFirstName, row.authorLastName].filter(Boolean);
	const authorDisplayName =
		nameParts.length > 0
			? nameParts.join(" ")
			: row.authorEmail?.trim() || row.shareEmail?.trim() || undefined;
	return {
		id: row.id,
		authorWallet: row.authorWallet,
		inviteToken: row.inviteToken,
		ciphertext: row.ciphertext,
		createdAt: row.createdAt,
		authorDisplayName,
		authorEmail: row.authorEmail ?? row.shareEmail ?? undefined,
	};
}

export async function assertActiveDraftShareForToken(
	inviteToken: string,
	draftId: string,
): Promise<void> {
	const [share] = await db
		.select({ id: draftExternalShares.id })
		.from(draftExternalShares)
		.where(
			and(
				eq(draftExternalShares.inviteToken, inviteToken),
				eq(draftExternalShares.draftId, draftId),
				pendingDraftShareFilter(),
			),
		)
		.limit(1);

	if (!share) {
		throwAppError("DRAFTS.INVITE_NOT_FOUND");
	}
}

export function assertDraftCommentCiphertextSize(ciphertext: string): void {
	if (ciphertext.length > MAX_DRAFT_COMMENT_CIPHERTEXT_HEX) {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					message: "Comment ciphertext is too large",
					path: ["ciphertext"],
				},
			]),
		);
	}
}

export async function assertDraftCommentCountBelowCeiling(
	draftId: string,
): Promise<void> {
	const [row] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(draftComments)
		.where(eq(draftComments.draftId, draftId));

	if ((row?.count ?? 0) >= MAX_DRAFT_COMMENTS_PER_DRAFT) {
		throwAppError("DRAFTS.RATE_LIMITED");
	}
}

export async function assertDraftCommentAuthorOrThrow(args: {
	draftId: string;
	commentId: string;
	wallet: Address;
}) {
	const [row] = await db
		.select({ authorWallet: draftComments.authorWallet })
		.from(draftComments)
		.where(
			and(
				eq(draftComments.id, args.commentId),
				eq(draftComments.draftId, args.draftId),
			),
		)
		.limit(1);
	if (!row) {
		throwAppError("DRAFTS.NOT_FOUND");
	}
	if (
		!row.authorWallet ||
		getAddress(row.authorWallet) !== getAddress(args.wallet)
	) {
		throwAppError("DRAFTS.FORBIDDEN");
	}
}
