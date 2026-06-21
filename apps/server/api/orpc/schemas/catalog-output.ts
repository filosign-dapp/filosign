import {
	zContentFingerprint,
	zSystemTemplateMeta,
	zTemplatePlaintextSha256,
	zTemplateSnapshot,
} from "@filosign/shared";
import { z } from "zod";
import { zDateWire } from "./rpc-wire";

export const rpcCatalogDocumentWireSchema = z.object({
	docId: z.string(),
	name: z.string(),
	size: z.number().int().positive(),
	mimeType: z.string(),
	plaintextSha256: zTemplatePlaintextSha256,
	downloadUrl: z.url(),
});

export const rpcCatalogTemplateSummarySchema = z.object({
	id: z.uuid(),
	name: z.string(),
	meta: zSystemTemplateMeta,
	catalogVersionLabel: z.string(),
	contentFingerprint: zContentFingerprint,
	roleCount: z.number().int().nonnegative(),
	fieldCount: z.number().int().nonnegative(),
	docCount: z.number().int().nonnegative(),
	publishedAt: zDateWire.nullable(),
	newerVersionAvailable: z.boolean(),
	alreadyInstalledInWorkspace: z.boolean(),
});

export const rpcCatalogListOutputSchema = z.object({
	templates: z.array(rpcCatalogTemplateSummarySchema),
});

export const rpcCatalogGetOutputSchema = z.object({
	template: rpcCatalogTemplateSummarySchema.extend({
		snapshotJson: zTemplateSnapshot,
		documents: z.array(rpcCatalogDocumentWireSchema),
	}),
});

export const rpcCatalogPrepareInstallOutputSchema = z.object({
	systemTemplateId: z.uuid(),
	name: z.string(),
	catalogVersionLabel: z.string(),
	systemContentFingerprint: zContentFingerprint,
	snapshotJson: zTemplateSnapshot,
	documents: z.array(rpcCatalogDocumentWireSchema),
});

export const rpcSystemTemplateSummarySchema = z.object({
	id: z.uuid(),
	name: z.string(),
	status: z.enum(["draft", "published", "archived"]),
	meta: zSystemTemplateMeta,
	catalogVersionLabel: z.string(),
	contentFingerprint: zContentFingerprint,
	createdByWallet: z.string(),
	publishedAt: zDateWire.nullable(),
	archivedAt: zDateWire.nullable(),
	createdAt: zDateWire,
	updatedAt: zDateWire,
	roleCount: z.number().int().nonnegative(),
	fieldCount: z.number().int().nonnegative(),
	docCount: z.number().int().nonnegative(),
});

export const rpcSystemTemplateWireSchema = rpcSystemTemplateSummarySchema
	.omit({
		docCount: true,
	})
	.extend({
		snapshotJson: zTemplateSnapshot,
	});

export const rpcSystemTemplateGetOutputSchema = z.object({
	template: rpcSystemTemplateWireSchema,
	documents: z.array(
		z.object({
			docId: z.string(),
			name: z.string(),
			size: z.number().int().positive(),
			mimeType: z.string(),
			plaintextSha256: z.string(),
			s3Key: z.string().optional(),
			downloadUrl: z.url().optional(),
		}),
	),
});

export const rpcSystemTemplatesListOutputSchema = z.object({
	templates: z.array(rpcSystemTemplateSummarySchema),
});

export const rpcSystemTemplateOutputSchema = z.object({
	template: rpcSystemTemplateWireSchema,
});

export const rpcSystemTemplatePrepareOutputSchema = z.object({
	systemTemplateId: z.uuid(),
	documents: z.array(
		z.object({
			docId: z.string(),
			s3Key: z.string(),
			needsUpload: z.boolean(),
			uploadUrl: z.url().optional(),
		}),
	),
});
