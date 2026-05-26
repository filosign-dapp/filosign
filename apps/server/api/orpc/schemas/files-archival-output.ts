import { z } from "zod";

export const archivalTierSchema = z.enum(["1y", "5y", "10y"]);
export const archivalStatusSchema = z.enum(["pending", "archived", "failed"]);

export const rpcFilesArchivalPurchaseOutputSchema = z.object({
	pieceCid: z.string(),
	tier: archivalTierSchema,
	status: z.literal("pending"),
	expiresAt: z.coerce.date(),
});

export const rpcFilesArchivalStatusOutputSchema = z.object({
	pieceCid: z.string(),
	archival: z
		.object({
			tier: archivalTierSchema,
			status: archivalStatusSchema,
			purchasedAt: z.coerce.date(),
			expiresAt: z.coerce.date(),
			archivedAt: z.coerce.date().nullable(),
			failureReason: z.string().nullable(),
		})
		.nullable(),
});
