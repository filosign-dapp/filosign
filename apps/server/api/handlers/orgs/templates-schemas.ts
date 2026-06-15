import { zTemplateSnapshot } from "@filosign/shared";
import { zHexString } from "@filosign/shared/zod";
import z from "zod";

const zTemplateDocumentRow = z.object({
	docId: z.string().min(1).max(128),
	s3Key: z.string().min(1),
	name: z.string().min(1).max(512),
	size: z.number().int().positive(),
	mimeType: z.string().min(1).max(128),
});

export const zOrgsTemplatePrepareCreateBody = z.object({
	templateId: z.uuid(),
	docIds: z.array(z.string().min(1).max(128)).min(1).max(20),
});

export const zOrgsTemplateCreateBody = z.object({
	templateId: z.uuid(),
	name: z.string().min(1).max(120),
	headDekWrappedOmk: zHexString(),
	headOmkKemCiphertext: zHexString(),
	snapshot: zTemplateSnapshot,
	documents: z.array(zTemplateDocumentRow).min(1).max(20),
});

export const zOrgsTemplatePrepareUpdateBody = z.object({
	templateId: z.uuid(),
	docIds: z.array(z.string().min(1).max(128)).max(20),
});

export const zOrgsTemplateUpdateBody = z.object({
	templateId: z.uuid(),
	name: z.string().min(1).max(120).optional(),
	headDekWrappedOmk: zHexString().optional(),
	headOmkKemCiphertext: zHexString().optional(),
	snapshot: zTemplateSnapshot,
	documents: z.array(zTemplateDocumentRow).min(1).max(20),
});

export type OrgsTemplateDocumentRow = z.infer<typeof zTemplateDocumentRow>;
