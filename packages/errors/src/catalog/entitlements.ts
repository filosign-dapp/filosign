import { z } from "zod";
import type { ErrorDefinition } from "../types";

export const entitlementErrors = {
	"ENTITLEMENT.FEATURE_DISABLED": {
		title: "Not included on your plan",
		description:
			"Your workspace plan does not include this capability. Upgrade to unlock it.",
		steps: [
			"Open Workspace in the sidebar (Account → Workspace).",
			"In Billing & Plans, compare plans and upgrade if needed.",
		],
		supportSlug: "feature-not-on-plan",
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
	},
	"ENTITLEMENT.QUOTA_EXCEEDED": {
		title: "Plan usage limit reached",
		description:
			"You have used {{used}} of {{limit}} documents allowed on your plan.",
		steps: [
			"Open Workspace → Billing & Plans to review usage.",
			"Upgrade your plan to send more envelopes.",
		],
		supportSlug: "plan-quota-exceeded",
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
		paramsSchema: z.object({
			used: z.number(),
			limit: z.number(),
		}),
		dedupeKey: "{{used}}-{{limit}}",
	},
	"ENTITLEMENT.LIMIT_EXCEEDED": {
		title: "Over the plan limit for this action",
		description:
			"This action goes past a fixed limit on your current plan (not a metered quota).",
		steps: [
			"Reduce what you are trying to do (for example, fewer recipients).",
			"Open Workspace → Billing & Plans to review limits or upgrade.",
		],
		supportSlug: "plan-limit-exceeded",
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
	},
} as const satisfies Record<string, ErrorDefinition>;
