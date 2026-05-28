/** Monthly + yearly SKUs map to the same Filosign plan (yearly = 15% off in Dodo dashboard). */
export const DODO_PRODUCT_PLAN_IDS: Record<
	string,
	"individual" | "teams" | "teams_pro"
> = {
	// Live Mode
	pdt_0NfmPizJ6Qed3qp9tEeim: "individual",
	pdt_0NfmfWinEiPodeNWGQ3ul: "individual",
	pdt_0NfmPufibqNnTIXEIbszF: "teams",
	pdt_0NfmfhPh81Fgklfe8WgQz: "teams",
	pdt_0NfmQBAAvXDqYiqWSz79B: "teams_pro",
	pdt_0Nfmg1rLmulqhqBBM2KHW: "teams_pro",

	// Test Mode
	pdt_0NfmyRtNYwE5g8OYgkbL3: "individual",
	pdt_0NfmyWM4nN9jYCspf5Scl: "individual",
	pdt_0NfmymopLpOgIv1IRallv: "teams",
	pdt_0NfmytI1yAAbhFZQEtUgK: "teams",
	pdt_0Nfmz3zlE8nPXI2lthZ9w: "teams_pro",
	pdt_0Nfmz9m978R3nH8g6DL3y: "teams_pro",
};

/** Yearly charge = monthly list × 12 × (1 − rate). Marketing uses 15% off. */
export const DODO_YEARLY_DISCOUNT_RATE = 0.15;

export function expectedYearlyChargeUsd(monthlyListUsd: number) {
	return (
		Math.round(monthlyListUsd * 12 * (1 - DODO_YEARLY_DISCOUNT_RATE) * 100) /
		100
	);
}

export function resolvePlanIdFromProductId(productId: string | undefined) {
	if (!productId) return null;
	return DODO_PRODUCT_PLAN_IDS[productId] ?? null;
}

export function shouldDowngradeToFree(eventType: string) {
	return (
		eventType === "subscription.cancelled" ||
		eventType === "subscription.expired"
	);
}

export function isAllowedReturnUrlOrigin(args: {
	returnUrl: string;
	clientUrl: string;
	allowedOrigins?: string;
}) {
	let parsed: URL;
	try {
		parsed = new URL(args.returnUrl);
	} catch {
		return false;
	}

	const allowed = new Set<string>([new URL(args.clientUrl).origin]);
	if (args.allowedOrigins) {
		for (const raw of args.allowedOrigins.split(",")) {
			const trimmed = raw.trim();
			if (!trimmed) continue;
			allowed.add(new URL(trimmed).origin);
		}
	}

	return allowed.has(parsed.origin);
}
