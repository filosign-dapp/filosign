import { PLAN_IDS } from "@filosign/entitlements";
import { z } from "zod";

const limitSnapshotSchema = z.object({
	limit: z.union([z.number(), z.boolean(), z.null()]),
	used: z.number().optional(),
	remaining: z.union([z.number(), z.null()]).optional(),
	allowed: z.boolean(),
});

export const rpcBillingEntitlementsOutputSchema = z.object({
	planId: z.enum(PLAN_IDS),
	limits: z.object({
		"documents.sent.monthly": limitSnapshotSchema,
		"envelope.recipients.max": limitSnapshotSchema,
	}),
	features: z.record(z.string(), z.object({ enabled: z.boolean() })),
});

export const rpcBillingCheckoutSessionOutputSchema = z.object({
	checkoutUrl: z.url(),
	sessionId: z.string().min(1),
});

export const rpcBillingPortalSessionOutputSchema = z.object({
	url: z.url(),
});

export const rpcBillingOrgSummaryOutputSchema = z.object({
	planId: z.enum(PLAN_IDS),
	seatCount: z.number().int(),
	usedSeats: z.number().int(),
	status: z.string(),
	provider: z.string(),
	billingInterval: z.enum(["monthly", "yearly"]).nullable(),
	periodStart: z.string().datetime().nullable(),
	periodEnd: z.string().datetime().nullable(),
	cancelAtPeriodEnd: z.boolean(),
	hasDodoSubscription: z.boolean(),
});

export const rpcBillingOrgSeatPreviewOutputSchema = z.object({
	planId: z.enum(["teams", "teams_pro"]).optional(),
	currentPlanId: z.enum(["teams", "teams_pro"]).optional(),
	seatCount: z.number().int(),
	currentSeatCount: z.number().int(),
	effectiveAt: z.string(),
	immediateChargeCents: z.number().int(),
	currency: z.string(),
});

export const rpcBillingOrgSeatsOutputSchema = z.object({
	seatCount: z.number().int(),
});

export const rpcBillingOrgPlanChangeOutputSchema = z.object({
	planId: z.enum(["teams", "teams_pro"]),
	seatCount: z.number().int(),
});
