import { throwAppError } from "@filosign/errors/server";
import {
	digestDraftSnapshot,
	draftDocumentKey,
	draftSnapshotKey,
	zDraftSnapshot,
} from "@filosign/shared";
import { zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import {
	assertEntitlement,
	resolveEntitlementContext,
} from "@/lib/domains/entitlements";
import { type ActiveOrgContext, assertOrgPermission } from "@/lib/domains/orgs";
import db from "@/lib/platform/db";
import { logger } from "@/lib/platform/pino";
import { bucket } from "@/lib/platform/s3/client";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";
import { assertDraftCreator, loadDraftOrThrow } from "./lifecycle";
import {
	assertDraftDocumentsExistOnS3,
	assertDraftSnapshotExistsOnS3,
	draftDocumentExistsOnS3,
	draftSnapshotExistsOnS3,
} from "./utils/verify-draft-storage";

export function logDraftSave(
	step: string,
	data?: Record<string, unknown>,
): void {
	logger.info({ ...data, draftSaveStep: step }, `[draft-save] ${step}`);
}

const { envelopeDrafts, envelopeDraftDocuments } = db.schema;

const zDocumentRow = z.object({
	docId: z.string().min(1).max(128),
	s3Key: z.string().min(1),
	name: z.string().min(1).max(512),
	size: z.number().int().positive(),
	mimeType: z.string().min(1).max(128),
});

export const zDraftPresignDocumentsBody = z.object({
	draftId: z.uuid(),
	docIds: z.array(z.string().min(1).max(128)).min(1).max(20),
});

export const zDraftSaveBody = z.object({
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

export const zDraftPrepareSaveBody = z.object({
	draftId: z.uuid(),
	docIds: z.array(z.string().min(1).max(128)).max(20),
	snapshotDigest: zSnapshotDigest.optional(),
});

export async function draftsSave(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	const parsed = zDraftSaveBody.safeParse(body);
	if (!parsed.success) {
		logDraftSave("save.parse_failed", { issues: parsed.error.message });
		throwZodBadRequest(parsed.error);
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
	parsed: z.infer<typeof zDraftSaveBody>,
) {
	assertOrgPermission(activeOrg, "drafts:write");
	const entitlementCtx = await resolveEntitlementContext(
		getAddress(wallet),
		activeOrg.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.team_drafts");
	const draft = await loadDraftOrThrow(parsed.draftId);
	if (draft.organizationId !== activeOrg.organizationId) {
		throwAppError("WORKSPACE.ORGANIZATION_MISMATCH");
	}
	await assertDraftCreator(wallet, draft);

	if (draft.status !== "active") {
		throwAppError("DRAFTS.NOT_EDITABLE");
	}
	if (draft.revision !== parsed.expectedRevision) {
		logDraftSave("save.revision_conflict", {
			draftId: draft.id,
			expectedRevision: parsed.expectedRevision,
			actualRevision: draft.revision,
		});
		throwAppError("DRAFTS.REVISION_CONFLICT");
	}

	const headDekWrappedOmk =
		parsed.headDekWrappedOmk ?? draft.headDekWrappedOmk ?? undefined;
	const headOmkKemCiphertext =
		parsed.headOmkKemCiphertext ?? draft.headOmkKemCiphertext ?? undefined;

	if (!headDekWrappedOmk || !headOmkKemCiphertext) {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					message:
						"headDekWrappedOmk and headOmkKemCiphertext required for org drafts",
					path: ["headDekWrappedOmk"],
				},
			]),
		);
	}

	const nextRevision = draft.revision + 1;
	const now = new Date();

	const computedSnapshotKey = draftSnapshotKey({
		draftId: draft.id,
		organizationId: draft.organizationId,
	});

	const incomingSnapshotDigest = digestDraftSnapshot(parsed.snapshot);
	const headSnapshotDigest = draft.headSnapshotDigest ?? null;
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
				headSnapshotDigest: incomingSnapshotDigest,
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
			throwAppError("DRAFTS.REVISION_CONFLICT");
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

export async function draftsPrepareSave(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	const parsed = zDraftPrepareSaveBody.safeParse(body);
	if (!parsed.success) {
		logDraftSave("prepare.parse_failed", { issues: parsed.error.message });
		throwZodBadRequest(parsed.error);
	}

	logDraftSave("prepare.start", {
		draftId: parsed.data.draftId,
		docIds: parsed.data.docIds,
	});

	assertOrgPermission(activeOrg, "drafts:write");
	const draft = await loadDraftOrThrow(parsed.data.draftId);
	if (draft.organizationId !== activeOrg.organizationId) {
		throwAppError("WORKSPACE.ORGANIZATION_MISMATCH");
	}
	await assertDraftCreator(wallet, draft);

	if (draft.status !== "active") {
		throwAppError("DRAFTS.NOT_EDITABLE");
	}

	const snapshotKey = draftSnapshotKey({
		draftId: draft.id,
		organizationId: draft.organizationId,
	});

	const headSnapshotDigest = draft.headSnapshotDigest ?? null;
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
		throwAppError("WORKSPACE.ORGANIZATION_MISMATCH");
	}
	await assertDraftCreator(wallet, draft);
	if (!draft.headSnapshotS3Key) {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					message: "Draft has no snapshot key",
					path: ["headSnapshotS3Key"],
				},
			]),
		);
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
	const parsed = zDraftPresignDocumentsBody.safeParse(body);
	if (!parsed.success) {
		throwZodBadRequest(parsed.error);
	}

	assertOrgPermission(activeOrg, "drafts:write");
	const draft = await loadDraftOrThrow(parsed.data.draftId);
	if (draft.organizationId !== activeOrg.organizationId) {
		throwAppError("WORKSPACE.ORGANIZATION_MISMATCH");
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
