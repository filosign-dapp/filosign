import type { UpgradePlanLimitReason } from "@filosign/react/billing";
import { PLAN_LIMIT_COPY } from "@/src/lib/domains/entitlements/plan-limit-copy";

export type PlanLimitToastFailure = {
	kind: "toast";
	title: string;
	hint: string;
};

export function planLimitToastFailure(
	reason: UpgradePlanLimitReason,
): PlanLimitToastFailure {
	const copy = PLAN_LIMIT_COPY[reason];
	return {
		kind: "toast",
		title: copy.title,
		hint: copy.description,
	};
}
