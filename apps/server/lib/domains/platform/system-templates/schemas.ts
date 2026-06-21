import {
	zSystemTemplateMeta,
	zTemplatePrepareUpdateDocumentRow,
	zTemplateSnapshot,
} from "@filosign/shared";
import z from "zod";
import {
	MAX_FILE_SIZE,
	MAX_TEMPLATE_DOCUMENTS,
	MAX_TEMPLATE_TOTAL_BYTES,
} from "@/constants";

const zSystemTemplateDocumentMetaRow = zTemplatePrepareUpdateDocumentRow.extend(
	{
		size: z
			.number()
			.int()
			.positive()
			.max(MAX_FILE_SIZE, { error: "Document exceeds maximum file size" }),
	},
);

const zSystemTemplateDocumentRow = zSystemTemplateDocumentMetaRow.extend({
	s3Key: z.string().min(1),
});

function documentsWithinLimits<T extends { size: number }>(
	documents: T[],
): boolean {
	if (documents.length > MAX_TEMPLATE_DOCUMENTS) return false;
	const totalBytes = documents.reduce((sum, doc) => sum + doc.size, 0);
	return totalBytes <= MAX_TEMPLATE_TOTAL_BYTES;
}

const zSystemTemplateDocumentsArray = z
	.array(zSystemTemplateDocumentRow)
	.min(1)
	.max(MAX_TEMPLATE_DOCUMENTS)
	.refine(documentsWithinLimits, {
		error: "Template documents exceed count or total size limits",
	});

const zSystemTemplatePrepareUpdateDocumentsArray = z
	.array(zSystemTemplateDocumentMetaRow)
	.min(1)
	.max(MAX_TEMPLATE_DOCUMENTS)
	.refine(documentsWithinLimits, {
		error: "Template documents exceed count or total size limits",
	});

export const zSystemTemplatePrepareCreateBody = z.object({
	systemTemplateId: z.uuid(),
	docIds: z
		.array(z.string().min(1).max(128))
		.min(1)
		.max(MAX_TEMPLATE_DOCUMENTS),
});

export const zSystemTemplateCreateBody = z.object({
	systemTemplateId: z.uuid(),
	name: z.string().min(1).max(120),
	meta: zSystemTemplateMeta,
	snapshot: zTemplateSnapshot,
	documents: zSystemTemplateDocumentsArray,
});

export const zSystemTemplatePrepareUpdateBody = z.object({
	systemTemplateId: z.uuid(),
	documents: zSystemTemplatePrepareUpdateDocumentsArray,
});

export const zSystemTemplateUpdateBody = z.object({
	systemTemplateId: z.uuid(),
	name: z.string().min(1).max(120).optional(),
	meta: zSystemTemplateMeta.optional(),
	snapshot: zTemplateSnapshot,
	documents: zSystemTemplateDocumentsArray,
});

export type SystemTemplateDocumentRow = z.infer<
	typeof zSystemTemplateDocumentRow
>;
