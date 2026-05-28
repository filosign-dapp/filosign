import {
	digestDraftSnapshot,
	draftDocumentKey,
	draftSnapshotKey,
	zDraftSnapshot,
} from "@filosign/shared";
import { zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
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
import { logDraftSave } from "./utils/draft-save-log";
import {
	assertDraftDocumentsExistOnS3,
	assertDraftSnapshotExistsOnS3,
	draftDocumentExistsOnS3,
	draftSnapshotExistsOnS3,
} from "./utils/verify-draft-storage";

const { envelopeDrafts, envelopeDraftDocuments, draftExternalShares } =
	db.schema;

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
	snapshot: zDraftSnapshot,
	headDekWrappedOmk: zHexString().optional(),
	headOmkKemCiphertext: zHexString().optional(),
	documents: z.array(zDocumentRow),
});

const zSnapshotDigest = zHexString();

const zPrepareSaveBody = z.object({
	draftId: z.uuid(),
	docIds: z.array(z.string().min(1).max(128)).max(20),
	snapshotDigest: zSnapshotDigest.optional(),
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
		logDraftSave("save.parse_failed", { issues: parsed.error.message });
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}

	logDraftSave("save.start", {
		draftId: parsed.data.draftId,
		expectedRevision: parsed.data.expectedRevision,
		documentCount: parsed.data.documents.length,
		hasHeadSnapshot: true,
	});

	try {
		return await draftsSaveInner(wallet, activeOrg, parsed.data);
	} catch (error) {
		logDraftSave("save.error", {
			draftId: parsed.data.draftId,
			message: error instanceof Error ? error.message : String(error),
			code: error instanceof ORPCError ? error.code : undefined,
		});
		throw error;
	}
}

async function draftsSaveInner(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	parsed: z.infer<typeof zSaveBody>,
) {
	assertOrgPermission(activeOrg, "drafts:write");
	const draft = await loadDraftOrThrow(parsed.draftId);
	if (draft.organizationId !== activeOrg.organizationId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "X-Org-Id must match this org draft",
		});
	}
	await assertDraftCreator(wallet, draft);

	if (draft.status !== "active") {
		throw new ORPCError("BAD_REQUEST", { message: "Draft is not editable" });
	}
	if (draft.revision !== parsed.expectedRevision) {
		logDraftSave("save.revision_conflict", {
			draftId: draft.id,
			expectedRevision: parsed.expectedRevision,
			actualRevision: draft.revision,
		});
		throw new ORPCError("CONFLICT", {
			message: "Draft was updated elsewhere; reload and try again",
			data: { revision: draft.revision },
		});
	}

	const headDekWrappedOmk =
		parsed.headDekWrappedOmk ?? draft.headDekWrappedOmk ?? undefined;
	const headOmkKemCiphertext =
		parsed.headOmkKemCiphertext ?? draft.headOmkKemCiphertext ?? undefined;

	if (!headDekWrappedOmk || !headOmkKemCiphertext) {
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

	const incomingSnapshotDigest = digestDraftSnapshot(parsed.snapshot);
	const headSnapshotParsed = draft.headSnapshot
		? zDraftSnapshot.safeParse(draft.headSnapshot)
		: null;
	const headSnapshotDigest =
		headSnapshotParsed?.success === true
			? digestDraftSnapshot(headSnapshotParsed.data)
			: null;
	const snapshotUnchanged =
		headSnapshotDigest != null && incomingSnapshotDigest === headSnapshotDigest;

	const existingDocRows = await db
		.select({ docId: envelopeDraftDocuments.docId })
		.from(envelopeDraftDocuments)
		.where(eq(envelopeDraftDocuments.draftId, draft.id));
	const existingDocIds = new Set(existingDocRows.map((r) => r.docId));

	logDraftSave("save.verify_s3.start", {
		draftId: draft.id,
		snapshotKey: computedSnapshotKey,
		docIds: parsed.documents.map((d) => d.docId),
		snapshotUnchanged,
	});

	const docIds = parsed.documents.map((doc) => doc.docId);
	const snapshotVerifyAttempts = snapshotUnchanged ? 1 : 2;
	const snapshotVerifyDelayMs = snapshotUnchanged ? 0 : 100;

	await Promise.all([
		assertDraftSnapshotExistsOnS3({
			draftId: draft.id,
			organizationId: draft.organizationId,
			attempts: snapshotVerifyAttempts,
			delayMs: snapshotVerifyDelayMs,
		}),
		docIds.length > 0
			? assertDraftDocumentsExistOnS3({
					draftId: draft.id,
					organizationId: draft.organizationId,
					docIds,
					retryByDocId: Object.fromEntries(
						docIds.map((docId) => [
							docId,
							{
								attempts: existingDocIds.has(docId) ? 1 : 2,
								delayMs: existingDocIds.has(docId) ? 0 : 100,
							},
						]),
					),
				})
			: Promise.resolve(),
	]);

	logDraftSave("save.verify_s3.ok", { draftId: draft.id });

	await db.transaction(async (tx) => {
		const [updated] = await tx
			.update(envelopeDrafts)
			.set({
				title: parsed.title?.trim() ?? draft.title,
				revision: nextRevision,
				headSnapshotS3Key: computedSnapshotKey,
				headSnapshot: parsed.snapshot,
				headDekWrappedOmk,
				headOmkKemCiphertext,
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

		if (parsed.documents.length > 0) {
			await tx.insert(envelopeDraftDocuments).values(
				parsed.documents.map((doc) => {
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

	logDraftSave("save.complete", {
		draftId: draft.id,
		revision: nextRevision,
	});

	return { revision: nextRevision };
}

export async function draftsList(wallet: Address, activeOrg: ActiveOrgContext) {
	assertOrgPermission(activeOrg, "drafts:read");
	const organizationId = activeOrg.organizationId;

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

	const headSnapshotParsed = draft.headSnapshot
		? zDraftSnapshot.safeParse(draft.headSnapshot)
		: null;

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
		headSnapshot: headSnapshotParsed?.success ? headSnapshotParsed.data : null,
		snapshot: {
			s3Key: draft.headSnapshotS3Key,
			downloadUrl: snapshotDownloadUrl,
		},
		documents: documentDownloads,
	};
}

export async function draftsPrepareSave(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	const parsed = zPrepareSaveBody.safeParse(body);
	if (!parsed.success) {
		logDraftSave("prepare.parse_failed", { issues: parsed.error.message });
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}

	logDraftSave("prepare.start", {
		draftId: parsed.data.draftId,
		docIds: parsed.data.docIds,
	});

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

	const snapshotKey = draftSnapshotKey({
		draftId: draft.id,
		organizationId: draft.organizationId,
	});

	const headSnapshotParsed = draft.headSnapshot
		? zDraftSnapshot.safeParse(draft.headSnapshot)
		: null;
	const headSnapshotDigest =
		headSnapshotParsed?.success === true
			? digestDraftSnapshot(headSnapshotParsed.data)
			: null;
	const snapshotExistsOnS3 = await draftSnapshotExistsOnS3({
		draftId: draft.id,
		organizationId: draft.organizationId,
	});
	const snapshotUnchanged =
		draft.revision > 0 &&
		parsed.data.snapshotDigest != null &&
		headSnapshotDigest != null &&
		parsed.data.snapshotDigest === headSnapshotDigest &&
		snapshotExistsOnS3;
	const snapshotNeedsUpload = !snapshotUnchanged;

	const documents = await Promise.all(
		parsed.data.docIds.map(async (docId) => {
			const s3Key = draftDocumentKey({
				draftId: draft.id,
				organizationId: draft.organizationId,
				docId,
			});
			const existsOnS3 = await draftDocumentExistsOnS3({
				draftId: draft.id,
				organizationId: draft.organizationId,
				docId,
			});
			const needsUpload = !existsOnS3;
			logDraftSave("prepare.doc", {
				draftId: draft.id,
				docId,
				s3Key,
				existsOnS3,
				needsUpload,
			});
			return {
				docId,
				s3Key,
				needsUpload,
				uploadUrl: needsUpload
					? bucket.presign(s3Key, {
							method: "PUT",
							expiresIn: 60 * 15,
							type: "application/octet-stream",
						})
					: undefined,
			};
		}),
	);

	const result = {
		snapshot: {
			s3Key: snapshotKey,
			needsUpload: snapshotNeedsUpload,
			uploadUrl: snapshotNeedsUpload
				? bucket.presign(snapshotKey, {
						method: "PUT",
						expiresIn: 60 * 15,
						type: "application/octet-stream",
					})
				: undefined,
		},
		documents,
	};

	logDraftSave("prepare.complete", {
		draftId: draft.id,
		snapshotKey,
		snapshotNeedsUpload,
		uploadCount: documents.filter((d) => d.needsUpload).length,
		skipCount: documents.filter((d) => !d.needsUpload).length,
	});

	return result;
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
