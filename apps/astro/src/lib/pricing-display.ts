/** Yearly billing: pay 85% of list monthly rate (15% off). */
export const YEARLY_DISCOUNT_RATE = 0.15;

export function yearlyPerMonthPrice(monthlyListUsd: number): number {
	if (monthlyListUsd === 15) return 12; // Solo: $15 monthly -> $12/mo yearly
	if (monthlyListUsd === 29) return 24; // Teams: $29 monthly -> $24/mo yearly
	if (monthlyListUsd === 49) return 39; // Teams Pro: $49 monthly -> $39/mo yearly

	const factor = 1 - YEARLY_DISCOUNT_RATE;
	return Math.round(monthlyListUsd * factor);
}

export function yearlyTotalPrice(monthlyListUsd: number): number {
	if (monthlyListUsd === 15) return 144; // Solo: $12 * 12 = $144
	if (monthlyListUsd === 29) return 288; // Teams: $24 * 12 = $288
	if (monthlyListUsd === 49) return 468; // Teams Pro: $39 * 12 = $468

	return Math.round(monthlyListUsd * 12 * (1 - YEARLY_DISCOUNT_RATE));
}

/** Whole dollars when possible; otherwise two decimals. Always whole integers for displays. */
export function formatUsdAmount(amount: number): string {
	return String(Math.round(amount));
}
