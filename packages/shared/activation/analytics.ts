import type { Deployment } from "../utils/deployment";
import type { ActivationMilestoneId } from "./milestones";
import type {
	ActivationProfileId,
	ActivationStepId,
	BillingPlanId,
} from "./types";

/** PostHog / server analytics property keys for activation funnel events. */
export const ACTIVATION_ANALYTICS_KEYS = {
	deployment: "deployment",
	activationProfileId: "activation_profile_id",
	billingPlanId: "billing_plan_id",
	catalogVersion: "catalog_version",
	stepId: "step_id",
	hintId: "hint_id",
	milestone: "milestone",
} as const;

export function activationAnalyticsContext(args: {
	deployment: Deployment;
	activationProfileId: ActivationProfileId;
	billingPlanId: BillingPlanId;
	catalogVersion?: number;
	stepId?: ActivationStepId;
	hintId?: string;
	milestone?: ActivationMilestoneId;
}): Record<string, string | number> {
	const out: Record<string, string | number> = {
		[ACTIVATION_ANALYTICS_KEYS.deployment]: args.deployment,
		[ACTIVATION_ANALYTICS_KEYS.activationProfileId]: args.activationProfileId,
		[ACTIVATION_ANALYTICS_KEYS.billingPlanId]: args.billingPlanId,
	};
	if (args.catalogVersion != null) {
		out[ACTIVATION_ANALYTICS_KEYS.catalogVersion] = args.catalogVersion;
	}
	if (args.stepId) {
		out[ACTIVATION_ANALYTICS_KEYS.stepId] = args.stepId;
	}
	if (args.hintId) {
		out[ACTIVATION_ANALYTICS_KEYS.hintId] = args.hintId;
	}
	if (args.milestone) {
		out[ACTIVATION_ANALYTICS_KEYS.milestone] = args.milestone;
	}
	return out;
}
