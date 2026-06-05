import { ORPCError } from "@orpc/server";
import DodoPayments from "dodopayments";
import env from "@/env";
import { resolveDodoLiveMode } from "./mode";

/** Dodo API environment + default product IDs. `DODO_LIVE=false` → test_mode even on production. */
export function isDodoLiveMode(): boolean {
	return resolveDodoLiveMode({
		deployment: env.DEPLOYMENT,
		dodoLiveEnv: env.DODO_LIVE,
	});
}

export function requireDodoApiKey(): string {
	if (!env.DODO_API_KEY) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "Dodo Payments is not configured",
		});
	}
	return env.DODO_API_KEY;
}

export function createDodoClient(options?: { includeWebhookKey?: boolean }) {
	return new DodoPayments({
		bearerToken: requireDodoApiKey(),
		...(options?.includeWebhookKey !== false && env.DODO_WEBHOOK_KEY
			? { webhookKey: env.DODO_WEBHOOK_KEY }
			: {}),
		environment: isDodoLiveMode() ? "live_mode" : "test_mode",
	});
}

/** Monthly + yearly SKUs map to the same Filosign plan (yearly = 15% off in Dodo dashboard). */
export const DODO_PRODUCT_PLAN_IDS: Record<
	string,
	"individual" | "teams" | "teams_pro"
> = {
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

const DODO_YEARLY_PRODUCT_IDS = new Set([
	"pdt_0NfmfWinEiPodeNWGQ3ul",
	"pdt_0NfmfhPh81Fgklfe8WgQz",
	"pdt_0Nfmg1rLmulqhqBBM2KHW",
	"pdt_0NfmyWM4nN9jYCspf5Scl",
	"pdt_0NfmytI1yAAbhFZQEtUgK",
	"pdt_0Nfmz9m978R3nH8g6DL3y",
]);

export function resolveIntervalFromProductId(
	productId: string | undefined,
): "monthly" | "yearly" | null {
	if (!productId || !DODO_PRODUCT_PLAN_IDS[productId]) return null;
	return DODO_YEARLY_PRODUCT_IDS.has(productId) ? "yearly" : "monthly";
}

export function isOrgBillingPlanId(
	planId: string,
): planId is "teams" | "teams_pro" {
	return planId === "teams" || planId === "teams_pro";
}

/** Paid plans billed on organization_subscriptions (unified workspace billing). */
export function isWorkspaceBillingPlanId(
	planId: string,
): planId is "individual" | "teams" | "teams_pro" {
	return (
		planId === "individual" || planId === "teams" || planId === "teams_pro"
	);
}

/** Immediate entitlement revocation — term ended or hard cancel (not at period end). */
export function shouldDowngradeToFree(eventType: string) {
	return eventType === "subscription.expired";
}

export function isScheduledCancellation(args: {
	eventType: string;
	cancelAtNextBillingDate: boolean;
}) {
	return (
		args.eventType === "subscription.cancelled" && args.cancelAtNextBillingDate
	);
}

export function isImmediateCancellation(args: {
	eventType: string;
	cancelAtNextBillingDate: boolean;
}) {
	return (
		args.eventType === "subscription.cancelled" && !args.cancelAtNextBillingDate
	);
}

/** Webhook events that may omit product_id (cancel/expire). */
export function allowsMissingProductId(eventType: string) {
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
