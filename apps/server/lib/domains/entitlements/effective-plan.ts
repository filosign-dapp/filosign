import { DEFAULT_PLAN_ID, type PlanId } from "@filosign/entitlements";

export type SubscriptionAccessInput = {
	planId: PlanId;
	status: string;
	cancelAtPeriodEnd?: boolean;
	periodEnd?: Date | null;
};

export function effectivePlanIdFromStatus(
	sub: SubscriptionAccessInput | undefined,
	now = new Date(),
): PlanId {
	if (!sub) return DEFAULT_PLAN_ID;

	if (sub.status === "active" || sub.status === "trialing") {
		return sub.planId;
	}

	if (
		sub.cancelAtPeriodEnd &&
		sub.periodEnd &&
		sub.periodEnd.getTime() > now.getTime()
	) {
		return sub.planId;
	}

	// Payment retry window — keep plan while Dodo marks subscription on_hold.
	if (sub.status === "past_due") {
		return sub.planId;
	}

	return DEFAULT_PLAN_ID;
}
