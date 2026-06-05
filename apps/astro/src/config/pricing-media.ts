/** Pricing page imagery — avoid paths used on landing/about heroes where possible. */
export type CheckoutDialogPlanId = "individual" | "teams" | "teams_pro";

export const pricingMedia = {
	/** Checkout dialog hero image per paid plan (Solo / Teams / Teams Pro). */
	checkoutDialogImages: {
		individual: "/images/stock_10.webp",
		teams: "/images/stock_11.webp",
		teams_pro: "/images/stock_12.webp",
	},
} as const satisfies {
	checkoutDialogImages: Record<CheckoutDialogPlanId, string>;
};

export function checkoutDialogImageForPlan(
	planId: CheckoutDialogPlanId,
): string {
	return pricingMedia.checkoutDialogImages[planId];
}
