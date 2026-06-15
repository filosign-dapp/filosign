import { throwAppError } from "@filosign/errors/server";
import {
	templateDocumentStorageKey,
	templateSnapshotCounts,
} from "@filosign/shared";
import { and, eq, inArray } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import z from "zod";
import {
	type OrgsTemplateDocumentRow,
	zOrgsTemplateCreateBody,
	zOrgsTemplatePrepareCreateBody,
	zOrgsTemplatePrepareUpdateBody,
	zOrgsTemplateUpdateBody,
} from "@/api/handlers/orgs/templates-schemas";
import { writeAuditEvent } from "@/lib/domains/audit";
import {
	assertEntitlement,
	resolveEntitlementContext,
} from "@/lib/domains/entitlements";
import {
	type ActiveOrgContext,
	assertOrgPermission,
	listOrgTemplatesCached,
} from "@/lib/domains/orgs";
import { invalidateOrgTemplates } from "@/lib/platform/cache";
import db from "@/lib/platform/db";
import { bucket } from "@/lib/platform/s3/client";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";

const { organizationTemplates, organizationTemplateDocuments } = db.schema;

export {
	zOrgsTemplateCreateBody,
	zOrgsTemplatePrepareCreateBody,
	zOrgsTemplatePrepareUpdateBody,
	zOrgsTemplateUpdateBody,
} from "@/api/handlers/orgs/templates-schemas";

function expectedTemplateDocumentKey(args: {
	organizationId: string;
	templateId: string;
	docId: string;
}): string {
	return templateDocumentStorageKey(args);
}

function assertTemplateDocumentKeys(args: {
	organizationId: string;
	templateId: string;
	documents: OrgsTemplateDocumentRow[];
}): void {
	for (const doc of args.documents) {
		const expected = expectedTemplateDocumentKey({
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

export async function orgsTemplatesPrepareCreate(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	assertOrgPermission(activeOrg, "templates:write");
	const entitlementCtx = await resolveEntitlementContext(
		getAddress(wallet),
		activeOrg.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.shared_templates");
	const parsed = zOrgsTemplatePrepareCreateBody.safeParse(body);
	if (!parsed.success) throwZodBadRequest(parsed.error);

	return {
		templateId: parsed.data.templateId,
		documents: parsed.data.docIds.map((docId) => {
			const s3Key = expectedTemplateDocumentKey({
				organizationId: activeOrg.organizationId,
				templateId: parsed.data.templateId,
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
		}),
	};
}

export async function orgsTemplatesCreate(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	assertOrgPermission(activeOrg, "templates:write");
	const entitlementCtx = await resolveEntitlementContext(
		getAddress(wallet),
		activeOrg.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.shared_templates");
	const parsed = zOrgsTemplateCreateBody.safeParse(body);
	if (!parsed.success) throwZodBadRequest(parsed.error);

	assertTemplateDocumentKeys({
		organizationId: activeOrg.organizationId,
		templateId: parsed.data.templateId,
		documents: parsed.data.documents,
	});

	const [row] = await db
		.insert(organizationTemplates)
		.values({
			id: parsed.data.templateId,
			organizationId: activeOrg.organizationId,
			name: parsed.data.name.trim(),
			headDekWrappedOmk: parsed.data.headDekWrappedOmk,
			headOmkKemCiphertext: parsed.data.headOmkKemCiphertext,
			snapshotJson: parsed.data.snapshot,
			createdByWallet: getAddress(wallet),
		})
		.returning();

	if (!row) throwAppError("WORKSPACE.TEMPLATE_NOT_FOUND");

	await db.insert(organizationTemplateDocuments).values(
		parsed.data.documents.map((doc) => ({
			templateId: row.id,
			docId: doc.docId,
			s3Key: doc.s3Key,
			name: doc.name,
			size: doc.size,
			mimeType: doc.mimeType,
		})),
	);

	await writeAuditEvent({
		actorWallet: getAddress(wallet),
		organizationId: activeOrg.organizationId,
		action: "template.created",
		resourceType: "organization_template",
		resourceId: row.id,
		metadata: {
			documentCount: parsed.data.documents.length,
		},
	});
	await invalidateOrgTemplates(activeOrg.organizationId);
	return { template: wireTemplateRow(row) };
}

export async function orgsTemplatesList(
	wallet: Address,
	activeOrg: ActiveOrgContext,
) {
	assertOrgPermission(activeOrg, "templates:read");
	const entitlementCtx = await resolveEntitlementContext(
		getAddress(wallet),
		activeOrg.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.shared_templates");
	const templates = await listOrgTemplatesCached(activeOrg.organizationId);
	return { templates };
}

export async function orgsTemplatesGet(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	templateId: string,
) {
	assertOrgPermission(activeOrg, "templates:read");
	const entitlementCtx = await resolveEntitlementContext(
		getAddress(wallet),
		activeOrg.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.shared_templates");
	const row = await loadTemplateOrThrow({
		organizationId: activeOrg.organizationId,
		templateId,
	});
	const documents = await loadTemplateDocuments(templateId);
	return {
		template: wireTemplateRow(row),
		documents: documents.map((doc) => ({
			docId: doc.docId,
			name: doc.name,
			size: doc.size,
			mimeType: doc.mimeType,
			s3Key: doc.s3Key,
			downloadUrl: bucket.presign(doc.s3Key, {
				method: "GET",
				expiresIn: 300,
			}),
		})),
	};
}

export async function orgsTemplatesPrepareUpdate(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	assertOrgPermission(activeOrg, "templates:write");
	const entitlementCtx = await resolveEntitlementContext(
		getAddress(wallet),
		activeOrg.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.shared_templates");
	const parsed = zOrgsTemplatePrepareUpdateBody.safeParse(body);
	if (!parsed.success) throwZodBadRequest(parsed.error);

	await loadTemplateOrThrow({
		organizationId: activeOrg.organizationId,
		templateId: parsed.data.templateId,
	});

	return {
		templateId: parsed.data.templateId,
		documents: parsed.data.docIds.map((docId) => {
			const s3Key = expectedTemplateDocumentKey({
				organizationId: activeOrg.organizationId,
				templateId: parsed.data.templateId,
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
		}),
	};
}

export async function orgsTemplatesUpdate(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	assertOrgPermission(activeOrg, "templates:write");
	const entitlementCtx = await resolveEntitlementContext(
		getAddress(wallet),
		activeOrg.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.shared_templates");
	const parsed = zOrgsTemplateUpdateBody.safeParse(body);
	if (!parsed.success) throwZodBadRequest(parsed.error);

	await loadTemplateOrThrow({
		organizationId: activeOrg.organizationId,
		templateId: parsed.data.templateId,
	});

	assertTemplateDocumentKeys({
		organizationId: activeOrg.organizationId,
		templateId: parsed.data.templateId,
		documents: parsed.data.documents,
	});

	const existingDocs = await loadTemplateDocuments(parsed.data.templateId);
	const nextDocIds = new Set(parsed.data.documents.map((doc) => doc.docId));
	const removedKeys = existingDocs
		.filter((doc) => !nextDocIds.has(doc.docId))
		.map((doc) => doc.s3Key);

	const updateValues: Partial<typeof organizationTemplates.$inferInsert> = {
		snapshotJson: parsed.data.snapshot,
		updatedAt: new Date(),
	};
	if (parsed.data.name != null) {
		updateValues.name = parsed.data.name.trim();
	}
	if (parsed.data.headDekWrappedOmk != null) {
		updateValues.headDekWrappedOmk = parsed.data.headDekWrappedOmk;
	}
	if (parsed.data.headOmkKemCiphertext != null) {
		updateValues.headOmkKemCiphertext = parsed.data.headOmkKemCiphertext;
	}

	const [row] = await db
		.update(organizationTemplates)
		.set(updateValues)
		.where(
			and(
				eq(organizationTemplates.id, parsed.data.templateId),
				eq(organizationTemplates.organizationId, activeOrg.organizationId),
			),
		)
		.returning();

	if (!row) throwAppError("WORKSPACE.TEMPLATE_NOT_FOUND");

	await db
		.delete(organizationTemplateDocuments)
		.where(
			eq(organizationTemplateDocuments.templateId, parsed.data.templateId),
		);

	await db.insert(organizationTemplateDocuments).values(
		parsed.data.documents.map((doc) => ({
			templateId: parsed.data.templateId,
			docId: doc.docId,
			s3Key: doc.s3Key,
			name: doc.name,
			size: doc.size,
			mimeType: doc.mimeType,
		})),
	);

	if (removedKeys.length > 0) {
		await deleteTemplateS3Keys(removedKeys);
	}

	await writeAuditEvent({
		actorWallet: getAddress(wallet),
		organizationId: activeOrg.organizationId,
		action: "template.updated",
		resourceType: "organization_template",
		resourceId: parsed.data.templateId,
		metadata: {
			documentCount: parsed.data.documents.length,
			removedDocumentCount: removedKeys.length,
		},
	});
	await invalidateOrgTemplates(activeOrg.organizationId);
	return { template: wireTemplateRow(row) };
}

export async function orgsTemplatesCloneToEnvelope(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	templateId: string,
) {
	assertOrgPermission(activeOrg, "templates:use");
	assertOrgPermission(activeOrg, "documents:send");
	const entitlementCtx = await resolveEntitlementContext(
		getAddress(wallet),
		activeOrg.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.shared_templates");

	const row = await loadTemplateOrThrow({
		organizationId: activeOrg.organizationId,
		templateId,
	});
	const documents = await loadTemplateDocuments(templateId);
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
			downloadUrl: bucket.presign(doc.s3Key, {
				method: "GET",
				expiresIn: 300,
			}),
		})),
	};
}

export async function orgsTemplatesDelete(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	templateId: string,
) {
	assertOrgPermission(activeOrg, "templates:write");
	const entitlementCtx = await resolveEntitlementContext(
		getAddress(wallet),
		activeOrg.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.shared_templates");

	const documents = await loadTemplateDocuments(templateId);
	const [deleted] = await db
		.delete(organizationTemplates)
		.where(
			and(
				eq(organizationTemplates.id, templateId),
				eq(organizationTemplates.organizationId, activeOrg.organizationId),
			),
		)
		.returning();

	if (!deleted) throwAppError("WORKSPACE.TEMPLATE_NOT_FOUND");

	await deleteTemplateS3Keys(documents.map((doc) => doc.s3Key));

	await writeAuditEvent({
		actorWallet: getAddress(wallet),
		organizationId: activeOrg.organizationId,
		action: "template.deleted",
		resourceType: "organization_template",
		resourceId: templateId,
		metadata: {
			documentCount: documents.length,
		},
	});
	await invalidateOrgTemplates(activeOrg.organizationId);
	return { template: wireTemplateRow(deleted) };
}

export async function deleteOrphanTemplateDocuments(args: {
	organizationId: string;
	templateId: string;
	keepDocIds: string[];
}): Promise<string[]> {
	const existing = await loadTemplateDocuments(args.templateId);
	const keep = new Set(args.keepDocIds);
	const removed = existing.filter((doc) => !keep.has(doc.docId));
	if (removed.length === 0) return [];
	await db.delete(organizationTemplateDocuments).where(
		inArray(
			organizationTemplateDocuments.id,
			removed.map((doc) => doc.id),
		),
	);
	return removed.map((doc) => doc.s3Key);
}
