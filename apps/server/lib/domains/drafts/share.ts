import { zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
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

const zShareExternalBody = z.object({
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
					expiresAt: z.string().datetime().optional(),
				}),
				z.object({
					accessKind: z.literal("cold"),
					email: z.email(),
					inviteToken: z.string().min(16),
					wrappedDek: zHexString(),
					expiresAt: z.string().datetime().optional(),
				}),
			]),
		)
		.min(1)
		.max(50),
});

const zRevokeShareBody = z.object({
	shareId: z.uuid(),
});

const zCommentAppendBody = z.object({
	draftId: z.uuid(),
	commentId: z.uuid(),
	ciphertext: zHexString(),
	inviteToken: z.string().min(8).optional(),
});

export async function draftsShareExternal(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	const parsed = zShareExternalBody.safeParse(body);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}

	const draft = await loadDraftOrThrow(parsed.data.draftId);
	if (draft.organizationId !== activeOrg.organizationId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "X-Org-Id must match this org draft",
		});
	}
	await assertDraftCreator(wallet, draft);

	assertOrgPermission(activeOrg, "drafts:share");
	const entitlementCtx = await resolveEntitlementContext(
		getAddress(wallet),
		draft.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.draft_review_links");

	if (!draft.headSnapshotS3Key) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Save the draft before sharing",
		});
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
		throw new ORPCError("BAD_REQUEST", {
			message: "X-Org-Id must match this org draft",
		});
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
	const parsed = zRevokeShareBody.safeParse(body);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
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
		throw new ORPCError("NOT_FOUND", { message: "Share not found" });
	}

	const draft = await loadDraftOrThrow(share.draftId);
	if (draft.organizationId !== activeOrg.organizationId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "X-Org-Id must match this org draft",
		});
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
		throw new ORPCError("BAD_REQUEST", { message: "Invalid invite" });
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
		throw new ORPCError("NOT_FOUND", { message: "Invite not found" });
	}

	const draft = await loadDraftOrThrow(share.draftId);
	if (draft.status !== "active" || !draft.headSnapshotS3Key) {
		throw new ORPCError("NOT_FOUND", { message: "Draft not available" });
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
		throw new ORPCError("NOT_FOUND", { message: "Invite not found" });
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
		throw new ORPCError("BAD_REQUEST", { message: "Invalid invite" });
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
		throw new ORPCError("NOT_FOUND", {
			message: "Warm draft invite not found for this wallet",
		});
	}

	const draft = await loadDraftOrThrow(share.draftId);
	if (draft.status !== "active" || !draft.headSnapshotS3Key) {
		throw new ORPCError("NOT_FOUND", { message: "Draft not available" });
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
		throw new ORPCError("BAD_REQUEST", {
			message: "X-Org-Id must match this org draft",
		});
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
		})
		.from(draftComments)
		.where(eq(draftComments.draftId, draft.id))
		.orderBy(draftComments.createdAt);

	return { comments };
}

export async function draftsCommentsAppend(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	const parsed = zCommentAppendBody.safeParse(body);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}

	const draft = await loadDraftOrThrow(parsed.data.draftId);
	if (draft.organizationId !== activeOrg.organizationId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "X-Org-Id must match this org draft",
		});
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
