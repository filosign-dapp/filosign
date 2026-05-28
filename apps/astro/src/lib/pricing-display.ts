/** Yearly billing: pay 85% of list monthly rate (15% off). */
export const YEARLY_DISCOUNT_RATE = 0.15;

export function yearlyPerMonthPrice(monthlyListUsd: number): number {
	if (monthlyListUsd === 15) return 12; // Solo: $15 monthly -> $12/mo yearly
	if (monthlyListUsd === 39) return 32; // Teams: $39 monthly -> $32/mo yearly
	if (monthlyListUsd === 59) return 49; // Teams Pro: $59 monthly -> $49/mo yearly

	const factor = 1 - YEARLY_DISCOUNT_RATE;
	return Math.round(monthlyListUsd * factor);
}

export function yearlyTotalPrice(monthlyListUsd: number): number {
	if (monthlyListUsd === 15) return 144; // Solo: $12 * 12 = $144
	if (monthlyListUsd === 39) return 384; // Teams: $32 * 12 = $384
	if (monthlyListUsd === 59) return 588; // Teams Pro: $49 * 12 = $588

	return Math.round(monthlyListUsd * 12 * (1 - YEARLY_DISCOUNT_RATE));
}

/** Whole dollars when possible; otherwise two decimals. Always whole integers for displays. */
export function formatUsdAmount(amount: number): string {
	return String(Math.round(amount));
}
