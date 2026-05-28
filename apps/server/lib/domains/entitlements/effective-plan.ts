import { DEFAULT_PLAN_ID, type PlanId } from "@filosign/entitlements";

export function effectivePlanIdFromStatus(
	sub:
		| {
				planId: PlanId;
				status: string;
		  }
		| undefined,
): PlanId {
	if (!sub) return DEFAULT_PLAN_ID;
	if (sub.status === "active" || sub.status === "trialing") return sub.planId;
	return DEFAULT_PLAN_ID;
}
