/** Yearly billing: pay 85% of list monthly rate (15% off). */
export const YEARLY_DISCOUNT_RATE = 0.15;

export function yearlyPerMonthPrice(monthlyListUsd: number): number {
	if (monthlyListUsd === 20) return 15; // Solo: $20 monthly -> $15/mo yearly
	if (monthlyListUsd === 35) return 29; // Teams: $35 monthly -> $29/mo yearly
	if (monthlyListUsd === 59) return 49; // Teams Pro: $59 monthly -> $49/mo yearly

	const factor = 1 - YEARLY_DISCOUNT_RATE;
	return Math.round(monthlyListUsd * factor);
}

export function yearlyTotalPrice(monthlyListUsd: number): number {
	if (monthlyListUsd === 20) return 180; // Solo: $15 * 12 = $180
	if (monthlyListUsd === 35) return 348; // Teams: $29 * 12 = $348
	if (monthlyListUsd === 59) return 588; // Teams Pro: $49 * 12 = $588

	return Math.round(monthlyListUsd * 12 * (1 - YEARLY_DISCOUNT_RATE));
}

/** Whole dollars when possible; otherwise two decimals. Always whole integers for displays. */
export function formatUsdAmount(amount: number): string {
	return String(Math.round(amount));
}
