import { z } from "zod";
import { ARCHIVAL_PRODUCT_IDS } from "@/lib/domains/billing/utils/archival-products";

export const archivalProductIdSchema = z.enum(ARCHIVAL_PRODUCT_IDS);

export const archivalProductsOutput = z.object({
	products: z.array(
		z.object({
			productId: archivalProductIdSchema,
			termYears: z.number().int().positive(),
			amountUsd: z.number().positive(),
			label: z.string(),
			billingModel: z.enum(["subscription", "one_time"]),
		}),
	),
});

export const archivalPurchaseOutput = z.object({
	checkoutUrl: z.url(),
	sessionId: z.string(),
});

export const archivalStatusOutput = z.object({
	active: z.boolean(),
	productId: archivalProductIdSchema.nullable(),
	retentionUntil: z.string().datetime().nullable(),
	exportGraceUntil: z.string().datetime().nullable(),
	subscriptionStatus: z.enum(["none", "active", "lapsed"]),
});
