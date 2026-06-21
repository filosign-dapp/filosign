import { throwAppError } from "@filosign/errors/server";
import {
	type TemplateSnapshot,
	templateSnapshotCounts,
} from "@filosign/shared";
import { and, eq, inArray } from "drizzle-orm";
import type { Address, Hex } from "viem";
import { getAddress } from "viem";
import z from "zod";
import { writeAuditEvent } from "@/lib/domains/audit";
import { assertCatalogSourceOnOrgTemplateCreate } from "@/lib/domains/catalog";
import { resolveCatalogUpdateForOrgTemplate } from "@/lib/domains/catalog/utils/org-template-catalog-update";
import {
	assertEntitlement,
	resolveEntitlementContext,
} from "@/lib/domains/entitlements";
import {
	type ActiveOrgContext,
	assertOrgPermission,
	listOrgTemplatesCached,
	type OrgPermission,
} from "@/lib/domains/orgs";
import { invalidateOrgTemplates } from "@/lib/platform/cache";
import db from "@/lib/platform/db";
import { bucket } from "@/lib/platform/s3/client";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";
import type { OrgsTemplateDocumentRow } from "./schemas";
import {
	assertTemplateDocumentsExistOnS3,
	resolveTemplateDocumentNeedsUpload,
	templateDocumentS3Key,
} from "./storage";

const { organizationTemplates, organizationTemplateDocuments } = db.schema;

async function assertOrgTemplatesEntitlement(
	wallet: Address,
	activeOrg: ActiveOrgContext,
): Promise<void> {
	const entitlementCtx = await resolveEntitlementContext(
		getAddress(wallet),
		activeOrg.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.shared_templates");
}

export async function assertOrgTemplatesAccess(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	permission: OrgPermission,
): Promise<void> {
	assertOrgPermission(activeOrg, permission);
	await assertOrgTemplatesEntitlement(wallet, activeOrg);
}

export async function assertOrgTemplatesPermissions(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	permissions: OrgPermission[],
): Promise<void> {
	for (const permission of permissions) {
		assertOrgPermission(activeOrg, permission);
	}
	await assertOrgTemplatesEntitlement(wallet, activeOrg);
}

function assertTemplateDocumentKeys(args: {
	organizationId: string;
	templateId: string;
	documents: OrgsTemplateDocumentRow[];
}): void {
	for (const doc of args.documents) {
		const expected = templateDocumentS3Key({
			organizationId: args.organizationId,
			templateId: args.templateId,
			docId: doc.docId,
		});
		if (doc.s3Key !== expected) {
			throwZodBadRequest(
				new z.ZodError([
					{
						code: "custom",
						message: `Invalid s3Key for document ${doc.docId}`,
						path: ["documents"],
					},
				]),
			);
		}
	}
}

async function deleteTemplateS3Keys(keys: string[]): Promise<void> {
	for (const s3Key of keys) {
		const res = await bucket.delete(s3Key).then(
			() => ({ error: null as Error | null }),
			(error: unknown) => ({ error: error as Error }),
		);
		if (res.error) {
			console.warn("template storage delete failed", {
				s3Key,
				error: res.error,
			});
		}
	}
}

async function loadTemplateOrThrow(args: {
	organizationId: string;
	templateId: string;
}) {
	const [row] = await db
		.select()
		.from(organizationTemplates)
		.where(
			and(
				eq(organizationTemplates.id, args.templateId),
				eq(organizationTemplates.organizationId, args.organizationId),
			),
		)
		.limit(1);
	if (!row) throwAppError("WORKSPACE.TEMPLATE_NOT_FOUND");
	return row;
}

async function loadTemplateDocuments(templateId: string) {
	return db
		.select()
		.from(organizationTemplateDocuments)
		.where(eq(organizationTemplateDocuments.templateId, templateId));
}

function wireTemplateRow(row: typeof organizationTemplates.$inferSelect) {
	const counts = templateSnapshotCounts(row.snapshotJson);
	return {
		id: row.id,
		organizationId: row.organizationId,
		name: row.name,
		createdByWallet: row.createdByWallet,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		headDekWrappedOmk: row.headDekWrappedOmk,
		headOmkKemCiphertext: row.headOmkKemCiphertext,
		snapshotJson: row.snapshotJson,
		roleCount: counts.roleCount,
		fieldCount: counts.fieldCount,
	};
}

function presignTemplateDocumentPut(s3Key: string): string {
	return bucket.presign(s3Key, {
		method: "PUT",
		expiresIn: 60 * 15,
		type: "application/octet-stream",
	});
}

export async function prepareOrgTemplateCreate(args: {
	organizationId: string;
	templateId: string;
	docIds: string[];
}) {
	return {
		templateId: args.templateId,
		documents: args.docIds.map((docId) => {
			const s3Key = templateDocumentS3Key({
				organizationId: args.organizationId,
				templateId: args.templateId,
				docId,
			});
			return {
				docId,
				s3Key,
				needsUpload: true,
				uploadUrl: presignTemplateDocumentPut(s3Key),
			};
		}),
	};
}

export async function createOrgTemplate(args: {
	wallet: Address;
	organizationId: string;
	templateId: string;
	name: string;
	headDekWrappedOmk: Hex;
	headOmkKemCiphertext: Hex;
	snapshot: TemplateSnapshot;
	documents: OrgsTemplateDocumentRow[];
}) {
	assertTemplateDocumentKeys({
		organizationId: args.organizationId,
		templateId: args.templateId,
		documents: args.documents,
	});

	await assertTemplateDocumentsExistOnS3({
		documents: args.documents.map((doc) => ({
			docId: doc.docId,
			s3Key: doc.s3Key,
		})),
	});

	if (args.snapshot.catalogSource) {
		await assertCatalogSourceOnOrgTemplateCreate({
			organizationId: args.organizationId,
			catalogSource: args.snapshot.catalogSource,
		});
	}

	const row = await db.transaction(async (tx) => {
		const [inserted] = await tx
			.insert(organizationTemplates)
			.values({
				id: args.templateId,
				organizationId: args.organizationId,
				name: args.name.trim(),
				headDekWrappedOmk: args.headDekWrappedOmk,
				headOmkKemCiphertext: args.headOmkKemCiphertext,
				snapshotJson: args.snapshot,
				createdByWallet: getAddress(args.wallet),
			})
			.returning();

		if (!inserted) throwAppError("WORKSPACE.TEMPLATE_NOT_FOUND");

		await tx.insert(organizationTemplateDocuments).values(
			args.documents.map((doc) => ({
				templateId: inserted.id,
				docId: doc.docId,
				s3Key: doc.s3Key,
				name: doc.name,
				size: doc.size,
				mimeType: doc.mimeType,
				plaintextSha256: doc.plaintextSha256,
			})),
		);

		return inserted;
	});

	await writeAuditEvent({
		actorWallet: getAddress(args.wallet),
		organizationId: args.organizationId,
		action: "template.created",
		resourceType: "organization_template",
		resourceId: row.id,
		metadata: {
			documentCount: args.documents.length,
		},
	});
	await invalidateOrgTemplates(args.organizationId);
	return { template: wireTemplateRow(row) };
}

export async function listOrgTemplates(organizationId: string) {
	const templates = await listOrgTemplatesCached(organizationId);
	return { templates };
}

export async function getOrgTemplate(args: {
	organizationId: string;
	templateId: string;
}) {
	const row = await loadTemplateOrThrow({
		organizationId: args.organizationId,
		templateId: args.templateId,
	});
	const documents = await loadTemplateDocuments(args.templateId);
	const catalogUpdate = await resolveCatalogUpdateForOrgTemplate(
		row.snapshotJson,
	);
	return {
		template: wireTemplateRow(row),
		documents: documents.map((doc) => ({
			docId: doc.docId,
			name: doc.name,
			size: doc.size,
			mimeType: doc.mimeType,
			plaintextSha256: doc.plaintextSha256,
			s3Key: doc.s3Key,
			downloadUrl: bucket.presign(doc.s3Key, {
				method: "GET",
				expiresIn: 300,
			}),
		})),
		catalogUpdate: catalogUpdate ?? undefined,
	};
}

export async function prepareOrgTemplateUpdate(args: {
	organizationId: string;
	templateId: string;
	documents: Array<{
		docId: string;
		plaintextSha256: OrgsTemplateDocumentRow["plaintextSha256"];
		name: string;
		size: number;
		mimeType: string;
	}>;
}) {
	await loadTemplateOrThrow({
		organizationId: args.organizationId,
		templateId: args.templateId,
	});

	const existingDocs = await loadTemplateDocuments(args.templateId);
	const existingByDocId = new Map(existingDocs.map((doc) => [doc.docId, doc]));

	const documents = await Promise.all(
		args.documents.map(async (doc) => {
			const s3Key = templateDocumentS3Key({
				organizationId: args.organizationId,
				templateId: args.templateId,
				docId: doc.docId,
			});
			const needsUpload = await resolveTemplateDocumentNeedsUpload({
				existingPlaintextSha256: existingByDocId.get(doc.docId)
					?.plaintextSha256,
				requestedPlaintextSha256: doc.plaintextSha256,
				s3Key,
			});
			return {
				docId: doc.docId,
				s3Key,
				needsUpload,
				uploadUrl: needsUpload ? presignTemplateDocumentPut(s3Key) : undefined,
			};
		}),
	);

	return {
		templateId: args.templateId,
		documents,
	};
}

export async function updateOrgTemplate(args: {
	wallet: Address;
	organizationId: string;
	templateId: string;
	name?: string;
	headDekWrappedOmk?: Hex;
	headOmkKemCiphertext?: Hex;
	snapshot: TemplateSnapshot;
	documents: OrgsTemplateDocumentRow[];
}) {
	await loadTemplateOrThrow({
		organizationId: args.organizationId,
		templateId: args.templateId,
	});

	assertTemplateDocumentKeys({
		organizationId: args.organizationId,
		templateId: args.templateId,
		documents: args.documents,
	});

	const existingDocs = await loadTemplateDocuments(args.templateId);
	const existingByDocId = new Map(existingDocs.map((doc) => [doc.docId, doc]));
	const nextDocIds = new Set(args.documents.map((doc) => doc.docId));
	const removedDocs = existingDocs.filter((doc) => !nextDocIds.has(doc.docId));
	const removedKeys = removedDocs.map((doc) => doc.s3Key);

	const uploadPlan = await Promise.all(
		args.documents.map(async (doc) => {
			const s3Key = templateDocumentS3Key({
				organizationId: args.organizationId,
				templateId: args.templateId,
				docId: doc.docId,
			});
			const needsUpload = await resolveTemplateDocumentNeedsUpload({
				existingPlaintextSha256: existingByDocId.get(doc.docId)
					?.plaintextSha256,
				requestedPlaintextSha256: doc.plaintextSha256,
				s3Key,
			});
			return { doc, needsUpload, s3Key };
		}),
	);

	await assertTemplateDocumentsExistOnS3({
		documents: uploadPlan.map((row) => ({
			docId: row.doc.docId,
			s3Key: row.s3Key,
		})),
	});

	const uploadedDocumentCount = uploadPlan.filter(
		(row) => row.needsUpload,
	).length;
	const skippedDocumentCount = uploadPlan.length - uploadedDocumentCount;

	const updateValues: Partial<typeof organizationTemplates.$inferInsert> = {
		snapshotJson: args.snapshot,
		updatedAt: new Date(),
	};
	if (args.name != null) {
		updateValues.name = args.name.trim();
	}
	if (args.headDekWrappedOmk != null) {
		updateValues.headDekWrappedOmk = args.headDekWrappedOmk;
	}
	if (args.headOmkKemCiphertext != null) {
		updateValues.headOmkKemCiphertext = args.headOmkKemCiphertext;
	}

	const row = await db.transaction(async (tx) => {
		const [updated] = await tx
			.update(organizationTemplates)
			.set(updateValues)
			.where(
				and(
					eq(organizationTemplates.id, args.templateId),
					eq(organizationTemplates.organizationId, args.organizationId),
				),
			)
			.returning();

		if (!updated) throwAppError("WORKSPACE.TEMPLATE_NOT_FOUND");

		if (removedDocs.length > 0) {
			await tx.delete(organizationTemplateDocuments).where(
				inArray(
					organizationTemplateDocuments.id,
					removedDocs.map((doc) => doc.id),
				),
			);
		}

		for (const doc of args.documents) {
			const existing = existingByDocId.get(doc.docId);
			if (!existing) {
				await tx.insert(organizationTemplateDocuments).values({
					templateId: args.templateId,
					docId: doc.docId,
					s3Key: doc.s3Key,
					name: doc.name,
					size: doc.size,
					mimeType: doc.mimeType,
					plaintextSha256: doc.plaintextSha256,
				});
				continue;
			}

			if (
				existing.name !== doc.name ||
				existing.size !== doc.size ||
				existing.mimeType !== doc.mimeType ||
				existing.plaintextSha256 !== doc.plaintextSha256
			) {
				await tx
					.update(organizationTemplateDocuments)
					.set({
						name: doc.name,
						size: doc.size,
						mimeType: doc.mimeType,
						plaintextSha256: doc.plaintextSha256,
						updatedAt: new Date(),
					})
					.where(eq(organizationTemplateDocuments.id, existing.id));
			}
		}

		return updated;
	});

	if (removedKeys.length > 0) {
		await deleteTemplateS3Keys(removedKeys);
	}

	await writeAuditEvent({
		actorWallet: getAddress(args.wallet),
		organizationId: args.organizationId,
		action: "template.updated",
		resourceType: "organization_template",
		resourceId: args.templateId,
		metadata: {
			documentCount: args.documents.length,
			uploadedDocumentCount,
			skippedDocumentCount,
			removedDocumentCount: removedDocs.length,
		},
	});
	await invalidateOrgTemplates(args.organizationId);
	return { template: wireTemplateRow(row) };
}

export async function cloneOrgTemplateToEnvelope(args: {
	organizationId: string;
	templateId: string;
}) {
	const row = await loadTemplateOrThrow({
		organizationId: args.organizationId,
		templateId: args.templateId,
	});
	const documents = await loadTemplateDocuments(args.templateId);
	if (documents.length === 0) {
		throwAppError("WORKSPACE.TEMPLATE_NOT_FOUND");
	}

	return {
		templateId: row.id,
		name: row.name,
		headDekWrappedOmk: row.headDekWrappedOmk,
		headOmkKemCiphertext: row.headOmkKemCiphertext,
		snapshotJson: row.snapshotJson,
		documents: documents.map((doc) => ({
			docId: doc.docId,
			name: doc.name,
			mimeType: doc.mimeType,
			size: doc.size,
			plaintextSha256: doc.plaintextSha256,
			downloadUrl: bucket.presign(doc.s3Key, {
				method: "GET",
				expiresIn: 300,
			}),
		})),
	};
}

export async function deleteOrgTemplate(args: {
	wallet: Address;
	organizationId: string;
	templateId: string;
}) {
	const documents = await loadTemplateDocuments(args.templateId);

	await deleteTemplateS3Keys(documents.map((doc) => doc.s3Key));

	const [deleted] = await db
		.delete(organizationTemplates)
		.where(
			and(
				eq(organizationTemplates.id, args.templateId),
				eq(organizationTemplates.organizationId, args.organizationId),
			),
		)
		.returning();

	if (!deleted) throwAppError("WORKSPACE.TEMPLATE_NOT_FOUND");

	await writeAuditEvent({
		actorWallet: getAddress(args.wallet),
		organizationId: args.organizationId,
		action: "template.deleted",
		resourceType: "organization_template",
		resourceId: args.templateId,
		metadata: {
			documentCount: documents.length,
		},
	});
	await invalidateOrgTemplates(args.organizationId);
	return { template: wireTemplateRow(deleted) };
}

export async function renameOrgTemplate(args: {
	wallet: Address;
	organizationId: string;
	templateId: string;
	name: string;
}) {
	const existing = await loadTemplateOrThrow({
		organizationId: args.organizationId,
		templateId: args.templateId,
	});
	const name = args.name.trim();
	const now = new Date();

	const [updated] = await db
		.update(organizationTemplates)
		.set({ name, updatedAt: now })
		.where(
			and(
				eq(organizationTemplates.id, args.templateId),
				eq(organizationTemplates.organizationId, args.organizationId),
			),
		)
		.returning();

	if (!updated) throwAppError("WORKSPACE.TEMPLATE_NOT_FOUND");

	await writeAuditEvent({
		actorWallet: getAddress(args.wallet),
		organizationId: args.organizationId,
		action: "template.renamed",
		resourceType: "organization_template",
		resourceId: args.templateId,
		metadata: {
			previousName: existing.name,
			name,
		},
	});
	await invalidateOrgTemplates(args.organizationId);
	return { template: wireTemplateRow(updated) };
}
