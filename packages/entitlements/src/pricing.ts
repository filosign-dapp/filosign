export const PLAN_PRICING = {
	individual: {
		monthly: 20,
		yearly: 15,
		yearlyTotal: 180,
	},
	teams: {
		monthly: 35,
		yearly: 29,
		yearlyTotal: 348,
	},
	teams_pro: {
		monthly: 59,
		yearly: 49,
		yearlyTotal: 588,
	},
} as const;

export type PlanPriceId = keyof typeof PLAN_PRICING;

export function getPlanPrice(
	planId: PlanPriceId,
	interval: "monthly" | "yearly",
): number {
	const info = PLAN_PRICING[planId];
	return interval === "yearly" ? info.yearly : info.monthly;
}

export function getPlanYearlyTotal(planId: PlanPriceId): number {
	return PLAN_PRICING[planId].yearlyTotal;
}
