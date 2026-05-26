import { zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import {
	assertEntitlement,
	resolveEntitlementContext,
} from "@/lib/domains/entitlements";
import { type ActiveOrgContext, assertOrgPermission } from "@/lib/domains/orgs";
import db from "@/lib/platform/db";
import { randomUuidV7 } from "@/lib/platform/db/random-uuid-v7";
import { bucket } from "@/lib/platform/s3/client";
import {
	assertCanReadDraft,
	assertDraftCreator,
	listDraftsForWallet,
	loadDraftOrThrow,
} from "./access";
import { draftDocumentKey, draftSnapshotKey } from "./storage-keys";

const {
	envelopeDrafts,
	envelopeDraftDocuments,
	draftExternalShares,
	organizationMembers,
} = db.schema;

const zCreateBody = z.object({
	title: z.string().min(1).max(200).optional(),
});

const zDocumentRow = z.object({
	docId: z.string().min(1).max(128),
	s3Key: z.string().min(1),
	name: z.string().min(1).max(512),
	size: z.int().positive(),
	mimeType: z.string().min(1).max(128),
});

const zSaveBody = z.object({
	draftId: z.uuid(),
	expectedRevision: z.number().int().nonnegative(),
	title: z.string().min(1).max(200).optional(),
	headSnapshotS3Key: z.string().min(1),
	headDekWrappedOmk: zHexString().optional(),
	headOmkKemCiphertext: zHexString().optional(),
	documents: z.array(zDocumentRow),
});

const zMarkSentBody = z.object({
	draftId: z.uuid(),
	pieceCid: z.string().min(1),
});

const zArchiveBody = z.object({
	draftId: z.uuid(),
});

export async function draftsCreate(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	const parsed = zCreateBody.safeParse(body);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}

	assertOrgPermission(activeOrg, "drafts:write");
	const organizationId = activeOrg.organizationId;

	const [memberCountRow] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(organizationMembers)
		.where(
			and(
				eq(organizationMembers.organizationId, organizationId),
				eq(organizationMembers.status, "active"),
			),
		);
	const memberCount = memberCountRow?.count ?? 1;

	if (memberCount > 1) {
		const entitlementCtx = await resolveEntitlementContext(
			getAddress(wallet),
			organizationId,
		);
		assertEntitlement(entitlementCtx, "features.team_drafts");
	}

	const draftId = randomUuidV7();
	const snapshotKey = draftSnapshotKey({
		draftId,
		organizationId,
	});

	const [row] = await db
		.insert(envelopeDrafts)
		.values({
			id: draftId,
			organizationId,
			createdByWallet: getAddress(wallet),
			title: parsed.data.title?.trim() || "Untitled draft",
			status: "active",
			revision: 0,
			headSnapshotS3Key: snapshotKey,
		})
		.returning();

	if (!row) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Draft not created",
		});
	}

	const uploadUrl = bucket.presign(snapshotKey, {
		method: "PUT",
		expiresIn: 60 * 15,
		type: "application/octet-stream",
	});

	return {
		draft: {
			id: row.id,
			organizationId: row.organizationId,
			title: row.title,
			revision: row.revision,
			status: row.status,
			createdByWallet: row.createdByWallet,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		},
		snapshot: {
			s3Key: snapshotKey,
			uploadUrl,
		},
	};
}

export async function draftsSave(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	const parsed = zSaveBody.safeParse(body);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}

	assertOrgPermission(activeOrg, "drafts:write");
	const draft = await loadDraftOrThrow(parsed.data.draftId);
	if (draft.organizationId !== activeOrg.organizationId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "X-Org-Id must match this org draft",
		});
	}
	await assertDraftCreator(wallet, draft);

	if (draft.status !== "active") {
		throw new ORPCError("BAD_REQUEST", { message: "Draft is not editable" });
	}
	if (draft.revision !== parsed.data.expectedRevision) {
		throw new ORPCError("CONFLICT", {
			message: "Draft was updated elsewhere; reload and try again",
			data: { revision: draft.revision },
		});
	}

	if (!parsed.data.headDekWrappedOmk || !parsed.data.headOmkKemCiphertext) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"headDekWrappedOmk and headOmkKemCiphertext required for org drafts",
		});
	}

	const nextRevision = draft.revision + 1;
	const now = new Date();

	const computedSnapshotKey = draftSnapshotKey({
		draftId: draft.id,
		organizationId: draft.organizationId,
	});

	await db.transaction(async (tx) => {
		const [updated] = await tx
			.update(envelopeDrafts)
			.set({
				title: parsed.data.title?.trim() ?? draft.title,
				revision: nextRevision,
				headSnapshotS3Key: computedSnapshotKey,
				headDekWrappedOmk: parsed.data.headDekWrappedOmk ?? null,
				headOmkKemCiphertext: parsed.data.headOmkKemCiphertext ?? null,
				updatedAt: now,
			})
			.where(
				and(
					eq(envelopeDrafts.id, draft.id),
					eq(envelopeDrafts.revision, draft.revision),
				),
			)
			.returning();

		if (!updated) {
			throw new ORPCError("CONFLICT", {
				message: "Draft was updated elsewhere; reload and try again",
				data: { revision: draft.revision },
			});
		}

		await tx
			.delete(envelopeDraftDocuments)
			.where(eq(envelopeDraftDocuments.draftId, draft.id));

		if (parsed.data.documents.length > 0) {
			await tx.insert(envelopeDraftDocuments).values(
				parsed.data.documents.map((doc) => {
					const computedDocKey = draftDocumentKey({
						draftId: draft.id,
						organizationId: draft.organizationId,
						docId: doc.docId,
					});
					return {
						draftId: draft.id,
						docId: doc.docId,
						s3Key: computedDocKey,
						name: doc.name,
						size: doc.size,
						mimeType: doc.mimeType,
						createdAt: now,
						updatedAt: now,
					};
				}),
			);
		}
	});

	return { revision: nextRevision };
}

export async function draftsList(wallet: Address, activeOrg: ActiveOrgContext) {
	assertOrgPermission(activeOrg, "drafts:read");
	const organizationId = activeOrg.organizationId;

	const [memberCountRow] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(organizationMembers)
		.where(
			and(
				eq(organizationMembers.organizationId, organizationId),
				eq(organizationMembers.status, "active"),
			),
		);
	const memberCount = memberCountRow?.count ?? 1;

	if (memberCount > 1) {
		const entitlementCtx = await resolveEntitlementContext(
			getAddress(wallet),
			organizationId,
		);
		assertEntitlement(entitlementCtx, "features.team_drafts");
	}

	const drafts = await listDraftsForWallet({
		wallet,
		organizationId,
	});

	return { drafts };
}

export async function draftsGet(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	draftId: string,
) {
	assertOrgPermission(activeOrg, "drafts:read");
	const draft = await loadDraftOrThrow(draftId);
	await assertCanReadDraft({ wallet, draft, activeOrg });

	if (!draft.headSnapshotS3Key) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Draft has no saved content",
		});
	}

	const documents = await db
		.select({
			docId: envelopeDraftDocuments.docId,
			s3Key: envelopeDraftDocuments.s3Key,
			name: envelopeDraftDocuments.name,
			size: envelopeDraftDocuments.size,
			mimeType: envelopeDraftDocuments.mimeType,
		})
		.from(envelopeDraftDocuments)
		.where(eq(envelopeDraftDocuments.draftId, draft.id));

	const snapshotDownloadUrl = bucket.presign(draft.headSnapshotS3Key, {
		method: "GET",
		expiresIn: 60 * 5,
	});

	const documentDownloads = documents.map((doc) => ({
		...doc,
		downloadUrl: bucket.presign(doc.s3Key, {
			method: "GET",
			expiresIn: 60 * 5,
		}),
	}));

	return {
		draft: {
			id: draft.id,
			organizationId: draft.organizationId,
			title: draft.title,
			status: draft.status,
			revision: draft.revision,
			createdByWallet: draft.createdByWallet,
			sentPieceCid: draft.sentPieceCid,
			createdAt: draft.createdAt,
			updatedAt: draft.updatedAt,
		},
		headDekWrappedOmk: draft.headDekWrappedOmk,
		headOmkKemCiphertext: draft.headOmkKemCiphertext,
		snapshot: {
			s3Key: draft.headSnapshotS3Key,
			downloadUrl: snapshotDownloadUrl,
		},
		documents: documentDownloads,
	};
}

export async function draftsPresignSnapshot(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	draftId: string,
) {
	assertOrgPermission(activeOrg, "drafts:write");
	const draft = await loadDraftOrThrow(draftId);
	if (draft.organizationId !== activeOrg.organizationId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "X-Org-Id must match this org draft",
		});
	}
	await assertDraftCreator(wallet, draft);
	if (!draft.headSnapshotS3Key) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Draft has no snapshot key",
		});
	}
	const uploadUrl = bucket.presign(draft.headSnapshotS3Key, {
		method: "PUT",
		expiresIn: 60 * 15,
		type: "application/octet-stream",
	});
	return {
		s3Key: draft.headSnapshotS3Key,
		uploadUrl,
	};
}

export async function draftsPresignDocuments(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	const parsed = z
		.object({
			draftId: z.uuid(),
			docIds: z.array(z.string().min(1).max(128)).min(1).max(20),
		})
		.safeParse(body);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}

	assertOrgPermission(activeOrg, "drafts:write");
	const draft = await loadDraftOrThrow(parsed.data.draftId);
	if (draft.organizationId !== activeOrg.organizationId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "X-Org-Id must match this org draft",
		});
	}
	await assertDraftCreator(wallet, draft);

	const uploads = parsed.data.docIds.map((docId) => {
		const s3Key = draftDocumentKey({
			draftId: draft.id,
			organizationId: draft.organizationId,
			docId,
		});
		return {
			docId,
			s3Key,
			uploadUrl: bucket.presign(s3Key, {
				method: "PUT",
				expiresIn: 60 * 15,
				type: "application/octet-stream",
			}),
		};
	});

	return { uploads };
}

export async function draftsMarkSent(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	const parsed = zMarkSentBody.safeParse(body);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}

	assertOrgPermission(activeOrg, "drafts:write");
	const draft = await loadDraftOrThrow(parsed.data.draftId);
	if (draft.organizationId !== activeOrg.organizationId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "X-Org-Id must match this org draft",
		});
	}
	await assertDraftCreator(wallet, draft);

	if (draft.status !== "active") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Only active drafts can be marked sent",
		});
	}

	const now = new Date();
	await db.transaction(async (tx) => {
		await tx
			.update(envelopeDrafts)
			.set({
				status: "sent",
				sentPieceCid: parsed.data.pieceCid,
				updatedAt: now,
			})
			.where(eq(envelopeDrafts.id, draft.id));

		await tx
			.update(draftExternalShares)
			.set({ revokedAt: now, updatedAt: now })
			.where(
				and(
					eq(draftExternalShares.draftId, draft.id),
					isNull(draftExternalShares.revokedAt),
				),
			);
	});

	return { ok: true as const };
}

export async function draftsArchive(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	const parsed = zArchiveBody.safeParse(body);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}

	assertOrgPermission(activeOrg, "drafts:write");
	const draft = await loadDraftOrThrow(parsed.data.draftId);
	if (draft.organizationId !== activeOrg.organizationId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "X-Org-Id must match this org draft",
		});
	}
	await assertDraftCreator(wallet, draft);

	if (draft.status !== "active") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Only active drafts can be deleted",
		});
	}

	const now = new Date();
	await db
		.update(envelopeDrafts)
		.set({ status: "archived", updatedAt: now })
		.where(eq(envelopeDrafts.id, draft.id));

	return { ok: true as const };
}
