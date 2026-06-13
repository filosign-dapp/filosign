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
	planName: z.string(),
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
	planName: z.string(),
	seatCount: z.number().int(),
	usedSeats: z.number().int(),
	status: z.string(),
	provider: z.string(),
	billingInterval: z.enum(["monthly", "yearly"]).nullable(),
	periodStart: z.iso.datetime().nullable(),
	periodEnd: z.iso.datetime().nullable(),
	cancelAtPeriodEnd: z.boolean(),
	hasDodoSubscription: z.boolean(),
});

const orgCheckoutPlanIdSchema = z.enum(["individual", "teams", "teams_pro"]);

export const rpcBillingOrgSeatPreviewOutputSchema = z.object({
	planId: orgCheckoutPlanIdSchema.optional(),
	currentPlanId: orgCheckoutPlanIdSchema.optional(),
	seatCount: z.number().int(),
	currentSeatCount: z.number().int(),
	deltaSeatCount: z.number().int(),
	isCredit: z.boolean(),
	effectiveAt: z.string(),
	immediateChargeCents: z.number().int(),
	currency: z.string(),
});

export const rpcBillingOrgSeatsOutputSchema = z.object({
	seatCount: z.number().int(),
	changed: z.boolean(),
	pendingPayment: z.boolean(),
});

export const rpcBillingOrgPlanChangeOutputSchema = z.object({
	planId: orgCheckoutPlanIdSchema,
	seatCount: z.number().int(),
	changed: z.boolean(),
});

export const rpcBillingUserSummaryOutputSchema = z.object({
	planId: z.enum(PLAN_IDS),
	planName: z.string(),
	status: z.string(),
	provider: z.string(),
	billingInterval: z.enum(["monthly", "yearly"]).nullable(),
	periodStart: z.iso.datetime().nullable(),
	periodEnd: z.iso.datetime().nullable(),
	cancelAtPeriodEnd: z.boolean(),
	hasDodoSubscription: z.boolean(),
});

const checkoutPlanIdSchema = z.enum(["individual", "teams", "teams_pro"]);

export const rpcBillingPlanOfferingSchema = z.object({
	planId: checkoutPlanIdSchema,
	visible: z.boolean(),
	selectable: z.boolean(),
	recommended: z.boolean(),
	checkoutRail: z.enum(["org"]),
	blockedReason: z.string().nullable(),
	cta: z.enum(["checkout", "workspace_billing", "change_plan", "none"]),
});

export const rpcBillingUpgradeOfferingsOutputSchema = z.object({
	effectivePlanId: z.enum(PLAN_IDS),
	offerings: z.array(rpcBillingPlanOfferingSchema),
	primaryCta: z.enum(["checkout", "workspace_billing", "change_plan", "none"]),
	comparePlansUrl: z.string(),
	noUpgradeMessage: z.string().nullable(),
});

export const rpcBillingWorkspaceAllowedActionsSchema = z.object({
	canCheckoutSolo: z.boolean(),
	canCheckoutTeams: z.boolean(),
	canChangeOrgPlan: z.boolean(),
	alternateOrgPlanId: z.enum(["teams", "teams_pro"]).nullable(),
	showPersonalPlanStrip: z.boolean(),
	showDualSubscriptionWarning: z.boolean(),
	showSoloOnWorkspace: z.boolean(),
});

export const rpcBillingPartnerInviteTrialSchema = z.object({
	active: z.literal(true),
	planId: z.enum(["teams", "teams_pro"]),
	planName: z.string(),
	trialDays: z.number().int(),
	periodEnd: z.iso.datetime().nullable(),
});

export const rpcBillingWorkspaceContextOutputSchema = z.object({
	user: rpcBillingUserSummaryOutputSchema,
	org: rpcBillingOrgSummaryOutputSchema,
	effectivePlanId: z.enum(PLAN_IDS),
	allowedActions: rpcBillingWorkspaceAllowedActionsSchema,
	partnerInviteTrial: rpcBillingPartnerInviteTrialSchema.nullable(),
});

export const rpcBillingMarketingPreviewOutputSchema = z.discriminatedUnion(
	"action",
	[
		z.object({ action: z.literal("send_link") }),
		z.object({
			action: z.literal("sign_in"),
			message: z.string(),
			clientUrl: z.url(),
		}),
		z.object({
			action: z.literal("already_subscribed"),
			message: z.string(),
			currentPlan: z.enum(PLAN_IDS),
			currentPlanName: z.string(),
			suggestedPlans: z.array(checkoutPlanIdSchema),
			comparePlansUrl: z.string(),
			clientUrl: z.url(),
		}),
		z.object({
			action: z.literal("use_in_app"),
			message: z.string(),
			deepLink: z.enum(["profile", "workspace"]),
			clientUrl: z.url(),
		}),
	],
);
