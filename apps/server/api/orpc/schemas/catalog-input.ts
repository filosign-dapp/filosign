import { z } from "zod";

export const rpcCatalogListInputSchema = z.object({
	category: z.string().min(1).max(64).optional(),
});

export const rpcCatalogGetInputSchema = z.object({
	systemTemplateId: z.uuid(),
});

export const rpcCatalogPrepareInstallInputSchema = z.object({
	systemTemplateId: z.uuid(),
});
