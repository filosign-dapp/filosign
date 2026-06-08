import { z } from "zod";

export const zDocumentsListTab = z.enum(["all", "sent", "received", "drafts"]);

export const zDocumentsListInputSchema = z.object({
	tab: zDocumentsListTab.optional(),
	cursor: z.string().max(512).optional(),
	limit: z.number().int().min(1).max(100).optional(),
	q: z.string().trim().min(1).max(100).optional(),
});

export type DocumentsListTab = z.infer<typeof zDocumentsListTab>;
export type DocumentsListInput = z.infer<typeof zDocumentsListInputSchema>;
