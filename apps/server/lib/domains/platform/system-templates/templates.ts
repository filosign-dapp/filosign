import { throwAppError } from "@filosign/errors/server";
import {
	catalogVersionLabelFromMeta,
	computeSystemTemplateContentFingerprint,
	type SystemTemplateMeta,
	type SystemTemplateStatus,
	type TemplateSnapshot,
	templateSnapshotCounts,
	zSystemTemplateMeta,
} from "@filosign/shared";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { assertPlatformAdmin } from "@/lib/platform/admin";
import db from "@/lib/platform/db";
import { bucket } from "@/lib/platform/s3/client";
import type { SystemTemplateDocumentRow } from "./schemas";
import {
	assertSystemTemplateDocumentsExistOnS3,
	deleteSystemTemplateS3Keys,
	resolveSystemTemplateDocumentNeedsUpload,
	systemTemplateDocumentS3Key,
} from "./storage";
import {
	assertSystemTemplateDeletable,
	assertSystemTemplateDocumentKeys,
	assertSystemTemplatePublishable,
} from "./utils/lifecycle";

const { systemTemplates, systemTemplateDocuments } = db.schema;

function computeFingerprintForTemplate(args: {
	snapshot: TemplateSnapshot;
	documents: SystemTemplateDocumentRow[];
}): `0x${string}` {
	return computeSystemTemplateContentFingerprint({
		snapshot: args.snapshot,
		documents: args.documents.map((doc) => ({
			docId: doc.docId,
			plaintextSha256: doc.plaintextSha256,
		})),
	});
}

async function loadSystemTemplateOrThrow(systemTemplateId: string) {
	const [row] = await db
		.select()
		.from(systemTemplates)
		.where(eq(systemTemplates.id, systemTemplateId))
		.limit(1);
	if (!row) throwAppError("PLATFORM.SYSTEM_TEMPLATE_NOT_FOUND");
	return row;
}

async function loadSystemTemplateDocuments(systemTemplateId: string) {
	return db
		.select()
		.from(systemTemplateDocuments)
		.where(eq(systemTemplateDocuments.systemTemplateId, systemTemplateId));
}

async function loadSystemTemplateDocCountMap(templateIds: string[]) {
	const countByTemplate = new Map<string, number>();
	if (templateIds.length === 0) return countByTemplate;

	const rows = await db
		.select({
			systemTemplateId: systemTemplateDocuments.systemTemplateId,
		})
		.from(systemTemplateDocuments)
		.where(inArray(systemTemplateDocuments.systemTemplateId, templateIds));

	for (const row of rows) {
		countByTemplate.set(
			row.systemTemplateId,
			(countByTemplate.get(row.systemTemplateId) ?? 0) + 1,
		);
	}
	return countByTemplate;
}

export async function wirePublishedSystemTemplateDocuments(
	systemTemplateId: string,
) {
	const documents = await loadSystemTemplateDocuments(systemTemplateId);
	return documents.map((doc) => ({
		docId: doc.docId,
		name: doc.name,
		size: doc.size,
		mimeType: doc.mimeType,
		plaintextSha256: doc.plaintextSha256,
		downloadUrl: bucket.presign(doc.s3Key, {
			method: "GET",
			expiresIn: 300,
		}),
	}));
}

function wireSystemTemplateRow(row: typeof systemTemplates.$inferSelect) {
	const meta = zSystemTemplateMeta.parse(row.metaJson);
	const counts = templateSnapshotCounts(row.snapshotJson);
	return {
		id: row.id,
		name: row.name,
		status: row.status as SystemTemplateStatus,
		meta,
		catalogVersionLabel: catalogVersionLabelFromMeta(meta),
		contentFingerprint: row.contentFingerprint,
		snapshotJson: row.snapshotJson,
		createdByWallet: row.createdByWallet,
		publishedAt: row.publishedAt,
		archivedAt: row.archivedAt,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		roleCount: counts.roleCount,
		fieldCount: counts.fieldCount,
	};
}

function presignSystemTemplateDocumentPut(s3Key: string): string {
	return bucket.presign(s3Key, {
		method: "PUT",
		expiresIn: 60 * 15,
		type: "application/pdf",
	});
}

export async function prepareSystemTemplateCreate(args: {
	systemTemplateId: string;
	docIds: string[];
}) {
	return {
		systemTemplateId: args.systemTemplateId,
		documents: args.docIds.map((docId) => {
			const s3Key = systemTemplateDocumentS3Key({
				systemTemplateId: args.systemTemplateId,
				docId,
			});
			return {
				docId,
				s3Key,
				needsUpload: true,
				uploadUrl: presignSystemTemplateDocumentPut(s3Key),
			};
		}),
	};
}

export async function createSystemTemplate(args: {
	wallet: Address;
	systemTemplateId: string;
	name: string;
	meta: SystemTemplateMeta;
	snapshot: TemplateSnapshot;
	documents: SystemTemplateDocumentRow[];
}) {
	await assertPlatformAdmin(args.wallet);

	assertSystemTemplateDocumentKeys({
		systemTemplateId: args.systemTemplateId,
		documents: args.documents,
	});

	await assertSystemTemplateDocumentsExistOnS3({
		documents: args.documents.map((doc) => ({
			docId: doc.docId,
			s3Key: doc.s3Key,
		})),
	});

	const contentFingerprint = computeFingerprintForTemplate({
		snapshot: args.snapshot,
		documents: args.documents,
	});

	const row = await db.transaction(async (tx) => {
		const [inserted] = await tx
			.insert(systemTemplates)
			.values({
				id: args.systemTemplateId,
				name: args.name.trim(),
				status: "draft",
				snapshotJson: args.snapshot,
				metaJson: args.meta,
				contentFingerprint,
				createdByWallet: getAddress(args.wallet),
			})
			.returning();

		if (!inserted) throwAppError("PLATFORM.SYSTEM_TEMPLATE_NOT_FOUND");

		await tx.insert(systemTemplateDocuments).values(
			args.documents.map((doc) => ({
				systemTemplateId: inserted.id,
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

	return { template: wireSystemTemplateRow(row) };
}

export async function listSystemTemplates(args: { wallet: Address }) {
	await assertPlatformAdmin(args.wallet);

	const rows = await db
		.select()
		.from(systemTemplates)
		.orderBy(desc(systemTemplates.updatedAt));

	const docCounts = await db
		.select({
			systemTemplateId: systemTemplateDocuments.systemTemplateId,
		})
		.from(systemTemplateDocuments);

	const countByTemplate = new Map<string, number>();
	for (const row of docCounts) {
		countByTemplate.set(
			row.systemTemplateId,
			(countByTemplate.get(row.systemTemplateId) ?? 0) + 1,
		);
	}

	return {
		templates: rows.map((row) => ({
			...wireSystemTemplateRow(row),
			docCount: countByTemplate.get(row.id) ?? 0,
		})),
	};
}

export async function getSystemTemplate(args: {
	wallet: Address;
	systemTemplateId: string;
}) {
	await assertPlatformAdmin(args.wallet);

	const row = await loadSystemTemplateOrThrow(args.systemTemplateId);
	const documents = await loadSystemTemplateDocuments(args.systemTemplateId);

	return {
		template: wireSystemTemplateRow(row),
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
	};
}

export async function prepareSystemTemplateUpdate(args: {
	wallet: Address;
	systemTemplateId: string;
	documents: Array<{
		docId: string;
		plaintextSha256: SystemTemplateDocumentRow["plaintextSha256"];
		name: string;
		size: number;
		mimeType: string;
	}>;
}) {
	await assertPlatformAdmin(args.wallet);
	await loadSystemTemplateOrThrow(args.systemTemplateId);

	const existingDocs = await loadSystemTemplateDocuments(args.systemTemplateId);
	const existingByDocId = new Map(existingDocs.map((doc) => [doc.docId, doc]));

	const documents = await Promise.all(
		args.documents.map(async (doc) => {
			const s3Key = systemTemplateDocumentS3Key({
				systemTemplateId: args.systemTemplateId,
				docId: doc.docId,
			});
			const needsUpload = await resolveSystemTemplateDocumentNeedsUpload({
				existingPlaintextSha256: existingByDocId.get(doc.docId)
					?.plaintextSha256,
				requestedPlaintextSha256: doc.plaintextSha256,
				s3Key,
			});
			return {
				docId: doc.docId,
				s3Key,
				needsUpload,
				uploadUrl: needsUpload
					? presignSystemTemplateDocumentPut(s3Key)
					: undefined,
			};
		}),
	);

	return {
		systemTemplateId: args.systemTemplateId,
		documents,
	};
}

export async function updateSystemTemplate(args: {
	wallet: Address;
	systemTemplateId: string;
	name?: string;
	meta?: SystemTemplateMeta;
	snapshot: TemplateSnapshot;
	documents: SystemTemplateDocumentRow[];
}) {
	await assertPlatformAdmin(args.wallet);
	await loadSystemTemplateOrThrow(args.systemTemplateId);

	assertSystemTemplateDocumentKeys({
		systemTemplateId: args.systemTemplateId,
		documents: args.documents,
	});

	const existingDocs = await loadSystemTemplateDocuments(args.systemTemplateId);
	const existingByDocId = new Map(existingDocs.map((doc) => [doc.docId, doc]));
	const nextDocIds = new Set(args.documents.map((doc) => doc.docId));
	const removedDocs = existingDocs.filter((doc) => !nextDocIds.has(doc.docId));
	const removedKeys = removedDocs.map((doc) => doc.s3Key);

	const uploadPlan = await Promise.all(
		args.documents.map(async (doc) => {
			const s3Key = systemTemplateDocumentS3Key({
				systemTemplateId: args.systemTemplateId,
				docId: doc.docId,
			});
			const needsUpload = await resolveSystemTemplateDocumentNeedsUpload({
				existingPlaintextSha256: existingByDocId.get(doc.docId)
					?.plaintextSha256,
				requestedPlaintextSha256: doc.plaintextSha256,
				s3Key,
			});
			return { doc, needsUpload, s3Key };
		}),
	);

	await assertSystemTemplateDocumentsExistOnS3({
		documents: uploadPlan.map((row) => ({
			docId: row.doc.docId,
			s3Key: row.s3Key,
		})),
	});

	const contentFingerprint = computeFingerprintForTemplate({
		snapshot: args.snapshot,
		documents: args.documents,
	});

	const updateValues: Partial<typeof systemTemplates.$inferInsert> = {
		snapshotJson: args.snapshot,
		contentFingerprint,
		updatedAt: new Date(),
	};
	if (args.name != null) {
		updateValues.name = args.name.trim();
	}
	if (args.meta != null) {
		updateValues.metaJson = args.meta;
	}

	const row = await db.transaction(async (tx) => {
		const [updated] = await tx
			.update(systemTemplates)
			.set(updateValues)
			.where(eq(systemTemplates.id, args.systemTemplateId))
			.returning();

		if (!updated) throwAppError("PLATFORM.SYSTEM_TEMPLATE_NOT_FOUND");

		if (removedDocs.length > 0) {
			await tx.delete(systemTemplateDocuments).where(
				inArray(
					systemTemplateDocuments.id,
					removedDocs.map((doc) => doc.id),
				),
			);
		}

		for (const doc of args.documents) {
			const existing = existingByDocId.get(doc.docId);
			if (!existing) {
				await tx.insert(systemTemplateDocuments).values({
					systemTemplateId: args.systemTemplateId,
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
					.update(systemTemplateDocuments)
					.set({
						name: doc.name,
						size: doc.size,
						mimeType: doc.mimeType,
						plaintextSha256: doc.plaintextSha256,
						updatedAt: new Date(),
					})
					.where(eq(systemTemplateDocuments.id, existing.id));
			}
		}

		return updated;
	});

	if (removedKeys.length > 0) {
		await deleteSystemTemplateS3Keys(removedKeys);
	}

	return { template: wireSystemTemplateRow(row) };
}

export async function publishSystemTemplate(args: {
	wallet: Address;
	systemTemplateId: string;
}) {
	await assertPlatformAdmin(args.wallet);
	const row = await loadSystemTemplateOrThrow(args.systemTemplateId);
	const documents = await loadSystemTemplateDocuments(args.systemTemplateId);
	assertSystemTemplatePublishable({
		status: row.status as SystemTemplateStatus,
		documentCount: documents.length,
	});

	const [updated] = await db
		.update(systemTemplates)
		.set({
			status: "published",
			publishedAt: new Date(),
			archivedAt: null,
			updatedAt: new Date(),
		})
		.where(eq(systemTemplates.id, args.systemTemplateId))
		.returning();

	if (!updated) throwAppError("PLATFORM.SYSTEM_TEMPLATE_NOT_FOUND");
	return { template: wireSystemTemplateRow(updated) };
}

export async function archiveSystemTemplate(args: {
	wallet: Address;
	systemTemplateId: string;
}) {
	await assertPlatformAdmin(args.wallet);
	await loadSystemTemplateOrThrow(args.systemTemplateId);

	const [updated] = await db
		.update(systemTemplates)
		.set({
			status: "archived",
			archivedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(systemTemplates.id, args.systemTemplateId))
		.returning();

	if (!updated) throwAppError("PLATFORM.SYSTEM_TEMPLATE_NOT_FOUND");
	return { template: wireSystemTemplateRow(updated) };
}

export async function deleteSystemTemplate(args: {
	wallet: Address;
	systemTemplateId: string;
}) {
	await assertPlatformAdmin(args.wallet);
	const row = await loadSystemTemplateOrThrow(args.systemTemplateId);
	assertSystemTemplateDeletable(row.status as SystemTemplateStatus);

	const documents = await loadSystemTemplateDocuments(args.systemTemplateId);
	await deleteSystemTemplateS3Keys(documents.map((doc) => doc.s3Key));

	const [deleted] = await db
		.delete(systemTemplates)
		.where(eq(systemTemplates.id, args.systemTemplateId))
		.returning();

	if (!deleted) throwAppError("PLATFORM.SYSTEM_TEMPLATE_NOT_FOUND");
	return { template: wireSystemTemplateRow(deleted) };
}

export async function getPublishedSystemTemplateWithDocuments(
	systemTemplateId: string,
) {
	const [row] = await db
		.select()
		.from(systemTemplates)
		.where(
			and(
				eq(systemTemplates.id, systemTemplateId),
				eq(systemTemplates.status, "published"),
			),
		)
		.limit(1);
	if (!row) throwAppError("PLATFORM.SYSTEM_TEMPLATE_NOT_PUBLISHED");

	const documents =
		await wirePublishedSystemTemplateDocuments(systemTemplateId);
	return {
		template: wireSystemTemplateRow(row),
		documents,
	};
}

export async function getPublishedSystemTemplateForInstall(
	systemTemplateId: string,
) {
	const { template, documents } =
		await getPublishedSystemTemplateWithDocuments(systemTemplateId);
	if (documents.length === 0) {
		throwAppError("PLATFORM.SYSTEM_TEMPLATE_EMPTY");
	}

	return {
		template,
		catalogVersionLabel: template.catalogVersionLabel,
		contentFingerprint: template.contentFingerprint,
		snapshotJson: template.snapshotJson,
		documents,
	};
}

export async function listPublishedSystemTemplates(args?: {
	category?: string;
}) {
	const rows = await db
		.select()
		.from(systemTemplates)
		.where(eq(systemTemplates.status, "published"))
		.orderBy(desc(systemTemplates.publishedAt));

	const filtered = rows.filter((row) => {
		if (!args?.category) return true;
		const meta = zSystemTemplateMeta.parse(row.metaJson);
		return meta.category === args.category;
	});
	const docCountByTemplate = await loadSystemTemplateDocCountMap(
		filtered.map((row) => row.id),
	);

	return filtered.map((row) => ({
		...wireSystemTemplateRow(row),
		docCount: docCountByTemplate.get(row.id) ?? 0,
	}));
}

export async function getPublishedSystemTemplate(systemTemplateId: string) {
	const [row] = await db
		.select()
		.from(systemTemplates)
		.where(
			and(
				eq(systemTemplates.id, systemTemplateId),
				eq(systemTemplates.status, "published"),
			),
		)
		.limit(1);
	if (!row) throwAppError("PLATFORM.SYSTEM_TEMPLATE_NOT_PUBLISHED");
	return wireSystemTemplateRow(row);
}
