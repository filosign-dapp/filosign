import { throwAppError } from "@filosign/errors/server";
import { zHexString } from "@filosign/shared/zod";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import {
	assertEntitlement,
	resolveEntitlementContext,
} from "@/lib/domains/entitlements";
import { inviteExpiresAt } from "@/lib/domains/invites";
import { type ActiveOrgContext, assertOrgPermission } from "@/lib/domains/orgs";
import db from "@/lib/platform/db";
import { sendDraftReviewInviteEmail } from "@/lib/platform/email";
import { bucket } from "@/lib/platform/s3/client";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";
import {
	assertCanReadDraft,
	assertDraftCreator,
	loadDraftOrThrow,
} from "./lifecycle";

const { envelopeDraftDocuments, draftExternalShares, draftComments, users } =
	db.schema;

function pendingDraftShareFilter() {
	return and(
		isNull(draftExternalShares.revokedAt),
		or(
			isNull(draftExternalShares.expiresAt),
			sql`${draftExternalShares.expiresAt} > now()`,
		),
	);
}

export const zDraftShareExternalBody = z.object({
	draftId: z.uuid(),
	shares: z
		.array(
			z.discriminatedUnion("accessKind", [
				z.object({
					accessKind: z.literal("warm"),
					email: z.email(),
					inviteToken: z.string().min(16),
					recipientWallet: z.string(),
					kemCiphertext: zHexString(),
					encryptedDek: zHexString(),
					expiresAt: z.iso.datetime().optional(),
				}),
				z.object({
					accessKind: z.literal("cold"),
					email: z.email(),
					inviteToken: z.string().min(16),
					wrappedDek: zHexString(),
					expiresAt: z.iso.datetime().optional(),
				}),
			]),
		)
		.min(1)
		.max(50),
});

export const zDraftRevokeExternalShareBody = z.object({
	shareId: z.uuid(),
});

export const zDraftCommentAppendBody = z.object({
	draftId: z.uuid(),
	commentId: z.uuid(),
	ciphertext: zHexString(),
	inviteToken: z.string().min(8).optional(),
});

export const zDraftCommentUpdateBody = z.object({
	draftId: z.uuid(),
	commentId: z.uuid(),
	ciphertext: zHexString(),
});

export const zDraftCommentDeleteBody = z.object({
	draftId: z.uuid(),
	commentId: z.uuid(),
});

export type DraftCommentAppendBody = z.infer<typeof zDraftCommentAppendBody>;
export type DraftCommentUpdateBody = z.infer<typeof zDraftCommentUpdateBody>;
export type DraftCommentDeleteBody = z.infer<typeof zDraftCommentDeleteBody>;

async function assertDraftCommentAuthorOrThrow(args: {
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

export async function draftsShareExternal(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	const parsed = zDraftShareExternalBody.safeParse(body);
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
	}

	const draft = await loadDraftOrThrow(parsed.data.draftId);
	if (draft.organizationId !== activeOrg.organizationId) {
		throwAppError("WORKSPACE.ORGANIZATION_MISMATCH");
	}
	await assertDraftCreator(wallet, draft);

	assertOrgPermission(activeOrg, "drafts:share");
	const entitlementCtx = await resolveEntitlementContext(
		getAddress(wallet),
		draft.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.draft_review_links");

	if (!draft.headSnapshotS3Key) {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					message: "Save the draft before sharing",
					path: ["headSnapshotS3Key"],
				},
			]),
		);
	}

	const senderWallet = getAddress(wallet);
	const [senderProfile] = await db
		.select({
			email: users.email,
			firstName: users.firstName,
			lastName: users.lastName,
		})
		.from(users)
		.where(eq(users.walletAddress, senderWallet))
		.limit(1);

	const senderName =
		[senderProfile?.firstName, senderProfile?.lastName]
			.filter(Boolean)
			.join(" ")
			.trim() || undefined;

	const now = new Date();
	const results: {
		shareId: string;
		email: string;
		accessKind: "warm" | "cold";
		inviteToken: string;
	}[] = [];

	for (const share of parsed.data.shares) {
		const expiresAt = share.expiresAt
			? new Date(share.expiresAt)
			: inviteExpiresAt();

		const values =
			share.accessKind === "warm"
				? {
						draftId: draft.id,
						email: share.email.trim().toLowerCase(),
						accessKind: "warm" as const,
						inviteToken: share.inviteToken,
						recipientWallet: getAddress(share.recipientWallet as Address),
						kemCiphertext: share.kemCiphertext,
						encryptedDek: share.encryptedDek,
						wrappedDek: null,
						expiresAt,
						createdByWallet: senderWallet,
						createdAt: now,
						updatedAt: now,
					}
				: {
						draftId: draft.id,
						email: share.email.trim().toLowerCase(),
						accessKind: "cold" as const,
						inviteToken: share.inviteToken,
						recipientWallet: null,
						kemCiphertext: null,
						encryptedDek: null,
						wrappedDek: share.wrappedDek,
						expiresAt,
						createdByWallet: senderWallet,
						createdAt: now,
						updatedAt: now,
					};

		const [row] = await db
			.insert(draftExternalShares)
			.values(values)
			.returning({
				id: draftExternalShares.id,
				email: draftExternalShares.email,
				accessKind: draftExternalShares.accessKind,
				inviteToken: draftExternalShares.inviteToken,
			});

		if (!row) continue;

		await sendDraftReviewInviteEmail({
			to: row.email,
			senderWallet,
			senderName,
			draftId: draft.id,
			draftTitle: draft.title,
			inviteToken: row.inviteToken,
			accessKind: row.accessKind as "warm" | "cold",
		});

		results.push({
			shareId: row.id,
			email: row.email,
			accessKind: row.accessKind as "warm" | "cold",
			inviteToken: row.inviteToken,
		});
	}

	return { shares: results };
}

export async function draftsListExternalShares(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	draftId: string,
) {
	const draft = await loadDraftOrThrow(draftId);
	if (draft.organizationId !== activeOrg.organizationId) {
		throwAppError("WORKSPACE.ORGANIZATION_MISMATCH");
	}
	await assertDraftCreator(wallet, draft);

	const shares = await db
		.select({
			id: draftExternalShares.id,
			email: draftExternalShares.email,
			accessKind: draftExternalShares.accessKind,
			inviteToken: draftExternalShares.inviteToken,
			recipientWallet: draftExternalShares.recipientWallet,
			expiresAt: draftExternalShares.expiresAt,
			revokedAt: draftExternalShares.revokedAt,
			createdAt: draftExternalShares.createdAt,
		})
		.from(draftExternalShares)
		.where(eq(draftExternalShares.draftId, draft.id))
		.orderBy(desc(draftExternalShares.createdAt));

	return { shares };
}

export async function draftsRevokeExternalShare(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	const parsed = zDraftRevokeExternalShareBody.safeParse(body);
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
	}

	const [share] = await db
		.select({
			id: draftExternalShares.id,
			draftId: draftExternalShares.draftId,
		})
		.from(draftExternalShares)
		.where(eq(draftExternalShares.id, parsed.data.shareId))
		.limit(1);

	if (!share) {
		throwAppError("DRAFTS.SHARE_NOT_FOUND");
	}

	const draft = await loadDraftOrThrow(share.draftId);
	if (draft.organizationId !== activeOrg.organizationId) {
		throwAppError("WORKSPACE.ORGANIZATION_MISMATCH");
	}
	await assertDraftCreator(wallet, draft);

	await db
		.update(draftExternalShares)
		.set({ revokedAt: new Date(), updatedAt: new Date() })
		.where(eq(draftExternalShares.id, share.id));

	return { ok: true as const };
}

export async function draftsReviewByToken(inviteToken: string) {
	if (!inviteToken || inviteToken.length < 8) {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					message: "Invalid invite token",
					path: ["inviteToken"],
				},
			]),
		);
	}

	const [share] = await db
		.select({
			id: draftExternalShares.id,
			draftId: draftExternalShares.draftId,
			email: draftExternalShares.email,
			accessKind: draftExternalShares.accessKind,
			wrappedDek: draftExternalShares.wrappedDek,
			kemCiphertext: draftExternalShares.kemCiphertext,
			encryptedDek: draftExternalShares.encryptedDek,
			expiresAt: draftExternalShares.expiresAt,
		})
		.from(draftExternalShares)
		.where(
			and(
				eq(draftExternalShares.inviteToken, inviteToken),
				pendingDraftShareFilter(),
			),
		)
		.limit(1);

	if (!share) {
		throwAppError("DRAFTS.INVITE_NOT_FOUND");
	}

	const draft = await loadDraftOrThrow(share.draftId);
	if (draft.status !== "active" || !draft.headSnapshotS3Key) {
		throwAppError("DRAFTS.NOT_FOUND");
	}

	if (share.accessKind === "warm") {
		return {
			accessKind: "warm" as const,
			draftId: draft.id,
			title: draft.title,
			email: share.email,
			expiresAt: share.expiresAt?.toISOString() ?? null,
		};
	}

	if (!share.wrappedDek) {
		throwAppError("DRAFTS.INVITE_NOT_FOUND");
	}

	const snapshotDownloadUrl = bucket.presign(draft.headSnapshotS3Key, {
		method: "GET",
		expiresIn: 60 * 5,
	});

	const documents = await db
		.select({
			docId: envelopeDraftDocuments.docId,
			s3Key: envelopeDraftDocuments.s3Key,
			name: envelopeDraftDocuments.name,
			mimeType: envelopeDraftDocuments.mimeType,
		})
		.from(envelopeDraftDocuments)
		.where(eq(envelopeDraftDocuments.draftId, draft.id));

	return {
		accessKind: "cold" as const,
		draftId: draft.id,
		title: draft.title,
		email: share.email,
		wrappedDek: share.wrappedDek,
		expiresAt: share.expiresAt?.toISOString() ?? null,
		snapshotDownloadUrl,
		documents: documents.map((doc) => ({
			...doc,
			downloadUrl: bucket.presign(doc.s3Key, {
				method: "GET",
				expiresIn: 60 * 5,
			}),
		})),
	};
}

export async function draftsReviewForWallet(
	wallet: Address,
	inviteToken: string,
) {
	if (!inviteToken || inviteToken.length < 8) {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					message: "Invalid invite token",
					path: ["inviteToken"],
				},
			]),
		);
	}

	const walletNorm = getAddress(wallet);
	const [share] = await db
		.select()
		.from(draftExternalShares)
		.where(
			and(
				eq(draftExternalShares.inviteToken, inviteToken),
				eq(draftExternalShares.accessKind, "warm"),
				eq(draftExternalShares.recipientWallet, walletNorm),
				pendingDraftShareFilter(),
			),
		)
		.limit(1);

	if (!share?.kemCiphertext || !share.encryptedDek) {
		throwAppError("DRAFTS.INVITE_NOT_FOUND");
	}

	const draft = await loadDraftOrThrow(share.draftId);
	if (draft.status !== "active" || !draft.headSnapshotS3Key) {
		throwAppError("DRAFTS.NOT_FOUND");
	}

	const documents = await db
		.select({
			docId: envelopeDraftDocuments.docId,
			s3Key: envelopeDraftDocuments.s3Key,
			name: envelopeDraftDocuments.name,
			mimeType: envelopeDraftDocuments.mimeType,
		})
		.from(envelopeDraftDocuments)
		.where(eq(envelopeDraftDocuments.draftId, draft.id));

	return {
		draftId: draft.id,
		title: draft.title,
		email: share.email,
		kemCiphertext: share.kemCiphertext,
		encryptedDek: share.encryptedDek,
		snapshotDownloadUrl: bucket.presign(draft.headSnapshotS3Key, {
			method: "GET",
			expiresIn: 60 * 5,
		}),
		documents: documents.map((doc) => ({
			...doc,
			downloadUrl: bucket.presign(doc.s3Key, {
				method: "GET",
				expiresIn: 60 * 5,
			}),
		})),
	};
}

export async function draftsCommentsList(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	draftId: string,
) {
	const draft = await loadDraftOrThrow(draftId);
	if (draft.organizationId !== activeOrg.organizationId) {
		throwAppError("WORKSPACE.ORGANIZATION_MISMATCH");
	}
	await assertCanReadDraft({ wallet, draft, activeOrg });

	const entitlementCtx = await resolveEntitlementContext(
		getAddress(wallet),
		draft.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.draft_comments");

	const comments = await db
		.select({
			id: draftComments.id,
			authorWallet: draftComments.authorWallet,
			inviteToken: draftComments.inviteToken,
			ciphertext: draftComments.ciphertext,
			createdAt: draftComments.createdAt,
			authorEmail: users.email,
			authorFirstName: users.firstName,
			authorLastName: users.lastName,
		})
		.from(draftComments)
		.leftJoin(users, eq(draftComments.authorWallet, users.walletAddress))
		.where(eq(draftComments.draftId, draft.id))
		.orderBy(draftComments.createdAt);

	return {
		comments: comments.map((row) => {
			const nameParts = [row.authorFirstName, row.authorLastName].filter(
				Boolean,
			);
			const authorDisplayName =
				nameParts.length > 0
					? nameParts.join(" ")
					: row.authorEmail?.trim() || undefined;
			return {
				id: row.id,
				authorWallet: row.authorWallet,
				inviteToken: row.inviteToken,
				ciphertext: row.ciphertext,
				createdAt: row.createdAt,
				authorDisplayName,
				authorEmail: row.authorEmail ?? undefined,
			};
		}),
	};
}

export async function draftsCommentsAppend(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	const parsed = zDraftCommentAppendBody.safeParse(body);
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
	}

	const draft = await loadDraftOrThrow(parsed.data.draftId);
	if (draft.organizationId !== activeOrg.organizationId) {
		throwAppError("WORKSPACE.ORGANIZATION_MISMATCH");
	}
	await assertCanReadDraft({ wallet, draft, activeOrg });

	const entitlementCtx = await resolveEntitlementContext(
		getAddress(wallet),
		draft.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.draft_comments");

	const [row] = await db
		.insert(draftComments)
		.values({
			id: parsed.data.commentId,
			draftId: draft.id,
			authorWallet: getAddress(wallet),
			inviteToken: parsed.data.inviteToken ?? null,
			ciphertext: parsed.data.ciphertext,
		})
		.returning({
			id: draftComments.id,
			createdAt: draftComments.createdAt,
		});

	return { comment: row };
}

export async function draftsCommentsUpdate(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	const parsed = zDraftCommentUpdateBody.safeParse(body);
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
	}

	const draft = await loadDraftOrThrow(parsed.data.draftId);
	if (draft.organizationId !== activeOrg.organizationId) {
		throwAppError("WORKSPACE.ORGANIZATION_MISMATCH");
	}
	await assertCanReadDraft({ wallet, draft, activeOrg });

	const entitlementCtx = await resolveEntitlementContext(
		getAddress(wallet),
		draft.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.draft_comments");

	await assertDraftCommentAuthorOrThrow({
		draftId: draft.id,
		commentId: parsed.data.commentId,
		wallet,
	});

	const [row] = await db
		.update(draftComments)
		.set({ ciphertext: parsed.data.ciphertext })
		.where(
			and(
				eq(draftComments.id, parsed.data.commentId),
				eq(draftComments.draftId, draft.id),
			),
		)
		.returning({ id: draftComments.id });

	if (!row) {
		throwAppError("DRAFTS.NOT_FOUND");
	}

	return { comment: row };
}

export async function draftsCommentsDelete(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	const parsed = zDraftCommentDeleteBody.safeParse(body);
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
	}

	const draft = await loadDraftOrThrow(parsed.data.draftId);
	if (draft.organizationId !== activeOrg.organizationId) {
		throwAppError("WORKSPACE.ORGANIZATION_MISMATCH");
	}
	await assertCanReadDraft({ wallet, draft, activeOrg });

	const entitlementCtx = await resolveEntitlementContext(
		getAddress(wallet),
		draft.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.draft_comments");

	await assertDraftCommentAuthorOrThrow({
		draftId: draft.id,
		commentId: parsed.data.commentId,
		wallet,
	});

	await db
		.delete(draftComments)
		.where(
			and(
				eq(draftComments.id, parsed.data.commentId),
				eq(draftComments.draftId, draft.id),
			),
		);

	return { deleted: true as const };
}
