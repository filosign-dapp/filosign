import type { PlanPriceId } from "@filosign/entitlements";
import { getPlanPrice, getPlanYearlyTotal } from "@filosign/entitlements";

/** Yearly billing: pay 85% of list monthly rate (15% off). */
export const YEARLY_DISCOUNT_RATE = 0.15;

function getPlanIdFromMonthlyPrice(monthlyListUsd: number): PlanPriceId {
	if (monthlyListUsd === 20) return "individual";
	if (monthlyListUsd === 35) return "teams";
	if (monthlyListUsd === 59) return "teams_pro";
	return "individual"; // fallback
}

export function yearlyPerMonthPrice(monthlyListUsd: number): number {
	const planId = getPlanIdFromMonthlyPrice(monthlyListUsd);
	return getPlanPrice(planId, "yearly");
}

export function yearlyTotalPrice(monthlyListUsd: number): number {
	const planId = getPlanIdFromMonthlyPrice(monthlyListUsd);
	return getPlanYearlyTotal(planId);
}

/** Whole dollars when possible; otherwise two decimals. Always whole integers for displays. */
export function formatUsdAmount(amount: number): string {
	return String(Math.round(amount));
}
