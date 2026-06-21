import {
	zTemplatePrepareUpdateDocumentRow,
	zTemplateSnapshot,
} from "@filosign/shared";
import { zHexString } from "@filosign/shared/zod";
import z from "zod";
import {
	MAX_FILE_SIZE,
	MAX_TEMPLATE_DOCUMENTS,
	MAX_TEMPLATE_TOTAL_BYTES,
} from "@/constants";

const zTemplateDocumentMetaRow = zTemplatePrepareUpdateDocumentRow.extend({
	size: z
		.number()
		.int()
		.positive()
		.max(MAX_FILE_SIZE, { error: "Document exceeds maximum file size" }),
});

const zTemplateDocumentRow = zTemplateDocumentMetaRow.extend({
	s3Key: z.string().min(1),
});

function templateDocumentsWithinLimits<T extends { size: number }>(
	documents: T[],
): boolean {
	if (documents.length > MAX_TEMPLATE_DOCUMENTS) return false;
	const totalBytes = documents.reduce((sum, doc) => sum + doc.size, 0);
	return totalBytes <= MAX_TEMPLATE_TOTAL_BYTES;
}

const zTemplateDocumentsArray = z
	.array(zTemplateDocumentRow)
	.min(1)
	.max(MAX_TEMPLATE_DOCUMENTS)
	.refine(templateDocumentsWithinLimits, {
		error: "Template documents exceed count or total size limits",
	});

const zTemplatePrepareUpdateDocumentsArray = z
	.array(zTemplateDocumentMetaRow)
	.min(1)
	.max(MAX_TEMPLATE_DOCUMENTS)
	.refine(templateDocumentsWithinLimits, {
		error: "Template documents exceed count or total size limits",
	});

export const zOrgsTemplatePrepareCreateBody = z.object({
	templateId: z.uuid(),
	docIds: z
		.array(z.string().min(1).max(128))
		.min(1)
		.max(MAX_TEMPLATE_DOCUMENTS),
});

export const zOrgsTemplateCreateBody = z.object({
	templateId: z.uuid(),
	name: z.string().min(1).max(120),
	headDekWrappedOmk: zHexString(),
	headOmkKemCiphertext: zHexString(),
	snapshot: zTemplateSnapshot,
	documents: zTemplateDocumentsArray,
});

export const zOrgsTemplatePrepareUpdateBody = z.object({
	templateId: z.uuid(),
	documents: zTemplatePrepareUpdateDocumentsArray,
});

export const zOrgsTemplateUpdateBody = z.object({
	templateId: z.uuid(),
	name: z.string().min(1).max(120).optional(),
	headDekWrappedOmk: zHexString().optional(),
	headOmkKemCiphertext: zHexString().optional(),
	snapshot: zTemplateSnapshot,
	documents: zTemplateDocumentsArray,
});

export const zOrgsTemplateRenameBody = z.object({
	templateId: z.uuid(),
	name: z.string().min(1).max(120),
});

export type OrgsTemplateDocumentRow = z.infer<typeof zTemplateDocumentRow>;
