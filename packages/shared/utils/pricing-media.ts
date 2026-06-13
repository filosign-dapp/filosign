export const PAID_CHECKOUT_PLAN_IDS = [
	"individual",
	"teams",
	"teams_pro",
] as const;

export type PaidCheckoutPlanId = (typeof PAID_CHECKOUT_PLAN_IDS)[number];

/** Site-root paths under `apps/astro/public` (pricing checkout dialog heroes). */
export const pricingCheckoutDialogImages = {
	individual: "/images/ww/stock_36.webp",
	teams: "/images/ww/stock_56.webp",
	teams_pro: "/images/ww/stock_47.webp",
} as const satisfies Record<PaidCheckoutPlanId, string>;

export function isPaidCheckoutPlanId(
	planId: string,
): planId is PaidCheckoutPlanId {
	return (PAID_CHECKOUT_PLAN_IDS as readonly string[]).includes(planId);
}

export function pricingCheckoutDialogImagePath(
	planId: PaidCheckoutPlanId,
): string {
	return pricingCheckoutDialogImages[planId];
}
