import { getPlanName, PLAN_IDS, type PlanId } from "@filosign/entitlements";
import { isWorkspaceBillingPlanId } from "./policy";

export const UPGRADE_LIMIT_REASONS = [
	"documents.sent.monthly",
	"envelope.recipients.max",
	"features.settlement.basic",
	"features.settlement.advanced",
	"features.routing.advanced",
	"features.shared_templates",
	"features.supplementary_attachments",
	"features.supplementary_attachments.recipient_select",
	"features.supplementary_attachments.conditional_release",
] as const;

export type UpgradeLimitReason = (typeof UPGRADE_LIMIT_REASONS)[number];

export type CheckoutPlanId = "individual" | "teams" | "teams_pro";

export type OfferingCta =
	| "checkout"
	| "workspace_billing"
	| "change_plan"
	| "none";

export type PlanOffering = {
	planId: CheckoutPlanId;
	visible: boolean;
	selectable: boolean;
	recommended: boolean;
	checkoutRail: "org";
	blockedReason: string | null;
	cta: OfferingCta;
};

export type BillingSummaryShape = {
	planId: PlanId;
	planName: string;
	status: string;
	provider: string;
	billingInterval: "monthly" | "yearly" | null;
	periodEnd: string | null;
	cancelAtPeriodEnd: boolean;
	hasDodoSubscription: boolean;
};

export type WorkspaceAllowedActions = {
	canCheckoutSolo: boolean;
	canCheckoutTeams: boolean;
	canChangeOrgPlan: boolean;
	alternateOrgPlanId: "teams" | "teams_pro" | null;
	showPersonalPlanStrip: boolean;
	showDualSubscriptionWarning: boolean;
	showSoloOnWorkspace: boolean;
};

const MIN_PLAN_FOR_REASON: Record<
	UpgradeLimitReason,
	"individual" | "teams" | "teams_pro"
> = {
	"documents.sent.monthly": "individual",
	"envelope.recipients.max": "individual",
	"features.settlement.basic": "teams",
	"features.settlement.advanced": "teams_pro",
	"features.routing.advanced": "teams_pro",
	"features.shared_templates": "teams",
	"features.supplementary_attachments": "teams",
	"features.supplementary_attachments.recipient_select": "teams_pro",
	"features.supplementary_attachments.conditional_release": "teams_pro",
};

const CHECKOUT_PLANS: CheckoutPlanId[] = ["individual", "teams", "teams_pro"];

function planTier(planId: PlanId): number {
	const idx = (PLAN_IDS as readonly string[]).indexOf(planId);
	return idx < 0 ? 0 : idx;
}

function isPaidWorkspacePlan(planId: PlanId): boolean {
	return isWorkspaceBillingPlanId(planId);
}

/** Workspace-scoped effective plan (org subscription only). */
function effectivePlanFromSummaries(args: { orgPlanId: PlanId }): PlanId {
	return args.orgPlanId;
}

/** Next checkout tiers that can resolve a gated feature (at or above minimum). */
function upgradeTargetsForReason(
	reason: UpgradeLimitReason,
	effectivePlanId: PlanId,
): CheckoutPlanId[] {
	const min = MIN_PLAN_FOR_REASON[reason];
	const minTier = planTier(min);
	const effectiveTier = planTier(effectivePlanId);

	return CHECKOUT_PLANS.filter((p) => {
		const t = planTier(p);
		return t >= minTier && t > effectiveTier;
	});
}

function buildOffering(args: {
	planId: CheckoutPlanId;
	reason: UpgradeLimitReason;
	orgPlanId: PlanId;
	effectivePlanId: PlanId;
	hasOrgDodo: boolean;
	targets: CheckoutPlanId[];
	recommended: CheckoutPlanId | null;
}): PlanOffering {
	const { planId, orgPlanId, hasOrgDodo, targets } = args;
	const rail = "org" as const;
	const inTargets = targets.includes(planId);

	if (!inTargets) {
		return {
			planId,
			visible: false,
			selectable: false,
			recommended: false,
			checkoutRail: rail,
			blockedReason: null,
			cta: "none",
		};
	}

	if (planId === "individual") {
		if (orgPlanId === "individual" && isPaidWorkspacePlan(orgPlanId)) {
			return {
				planId,
				visible: true,
				selectable: false,
				recommended: false,
				checkoutRail: rail,
				blockedReason: "This workspace is already on Solo.",
				cta: "workspace_billing",
			};
		}
		return {
			planId,
			visible: true,
			selectable: true,
			recommended: args.recommended === planId,
			checkoutRail: rail,
			blockedReason: null,
			cta: "checkout",
		};
	}

	const orgPaid = isPaidWorkspacePlan(orgPlanId);
	if (orgPlanId === planId && orgPaid) {
		return {
			planId,
			visible: true,
			selectable: false,
			recommended: false,
			checkoutRail: rail,
			blockedReason: `This workspace is already on ${getPlanName(planId)}.`,
			cta: "workspace_billing",
		};
	}

	if (orgPaid && hasOrgDodo && planTier(planId) > planTier(orgPlanId)) {
		return {
			planId,
			visible: true,
			selectable: true,
			recommended: args.recommended === planId,
			checkoutRail: rail,
			blockedReason: null,
			cta: "change_plan",
		};
	}

	return {
		planId,
		visible: true,
		selectable: true,
		recommended: args.recommended === planId,
		checkoutRail: rail,
		blockedReason: null,
		cta:
			hasOrgDodo && isPaidWorkspacePlan(orgPlanId) ? "change_plan" : "checkout",
	};
}

export function buildUpgradeOfferings(args: {
	reason: UpgradeLimitReason;
	userPlanId: PlanId;
	orgPlanId: PlanId;
	hasUserDodo: boolean;
	hasOrgDodo: boolean;
}): {
	effectivePlanId: PlanId;
	offerings: PlanOffering[];
	primaryCta: OfferingCta;
	comparePlansUrl: string;
	noUpgradeMessage: string | null;
} {
	const effectivePlanId = effectivePlanFromSummaries({
		orgPlanId: args.orgPlanId,
	});

	const targets = upgradeTargetsForReason(args.reason, effectivePlanId);
	const recommended = targets[0] ?? null;

	const offerings = CHECKOUT_PLANS.map((planId) =>
		buildOffering({
			planId,
			reason: args.reason,
			orgPlanId: args.orgPlanId,
			effectivePlanId,
			hasOrgDodo: args.hasOrgDodo,
			targets,
			recommended,
		}),
	).filter((o) => o.visible);

	const primaryOffering =
		offerings.find((o) => o.recommended && o.selectable) ??
		offerings.find((o) => o.selectable) ??
		offerings.find((o) => o.cta === "workspace_billing") ??
		offerings[0];

	const primaryCta = primaryOffering?.cta ?? "none";

	const noUpgradeMessage =
		offerings.length === 0
			? effectivePlanId === "individual"
				? "You're on Solo. Upgrade this workspace to Teams or Teams Pro for collaboration features."
				: "You're already on a plan that includes this feature. Compare plans or contact support if something looks wrong."
			: null;

	return {
		effectivePlanId,
		offerings,
		primaryCta,
		comparePlansUrl: "/pricing",
		noUpgradeMessage,
	};
}

export function buildWorkspaceAllowedActions(args: {
	userPlanId: PlanId;
	orgPlanId: PlanId;
	usedSeats: number;
	hasOrgDodo: boolean;
	orgProvider: string;
}): WorkspaceAllowedActions {
	const orgPaid = isPaidWorkspacePlan(args.orgPlanId);
	const orgTeams = args.orgPlanId === "teams" || args.orgPlanId === "teams_pro";

	let alternateOrgPlanId: "teams" | "teams_pro" | null = null;
	if (args.orgPlanId === "teams") alternateOrgPlanId = "teams_pro";
	if (args.orgPlanId === "teams_pro") alternateOrgPlanId = "teams";

	return {
		canCheckoutSolo:
			!orgPaid && args.orgPlanId === "free" && args.usedSeats <= 1,
		canCheckoutTeams: !orgTeams,
		canChangeOrgPlan:
			orgPaid &&
			args.hasOrgDodo &&
			args.orgProvider === "dodo" &&
			(alternateOrgPlanId !== null || args.orgPlanId === "individual"),
		alternateOrgPlanId:
			orgPaid && args.hasOrgDodo && orgTeams ? alternateOrgPlanId : null,
		showPersonalPlanStrip: false,
		showDualSubscriptionWarning: false,
		showSoloOnWorkspace:
			args.orgPlanId === "free" && args.usedSeats <= 1 && !orgPaid,
	};
}

export {
	isActivePaidPlan,
	resolveMarketingCheckoutPreview,
	subscriptionAccessFromRow,
} from "./marketing";
