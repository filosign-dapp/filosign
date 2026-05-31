import { dodoLive } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import type { Address } from "viem";
import env from "@/env";
import type { SubscriptionPlanId } from "@/lib/platform/db/schema/billing";

export type BillingInterval = "monthly" | "yearly";

const CHECKOUT_PLAN_IDS = [
	"individual",
	"teams",
	"teams_pro",
] as const satisfies SubscriptionPlanId[];

type CheckoutPlanId = (typeof CHECKOUT_PLAN_IDS)[number];

const DODO_TEST_PLAN_PRODUCT_IDS: Record<CheckoutPlanId, string> = {
	individual: "pdt_0NfmyRtNYwE5g8OYgkbL3",
	teams: "pdt_0NfmymopLpOgIv1IRallv",
	teams_pro: "pdt_0Nfmz3zlE8nPXI2lthZ9w",
};

const DODO_TEST_PLAN_PRODUCT_IDS_YEARLY: Record<CheckoutPlanId, string> = {
	individual: "pdt_0NfmyWM4nN9jYCspf5Scl",
	teams: "pdt_0NfmytI1yAAbhFZQEtUgK",
	teams_pro: "pdt_0Nfmz9m978R3nH8g6DL3y",
};

const DODO_LIVE_PLAN_PRODUCT_IDS: Record<CheckoutPlanId, string> = {
	individual: "pdt_0NfmPizJ6Qed3qp9tEeim",
	teams: "pdt_0NfmPufibqNnTIXEIbszF",
	teams_pro: "pdt_0NfmQBAAvXDqYiqWSz79B",
};

const DODO_LIVE_PLAN_PRODUCT_IDS_YEARLY: Record<CheckoutPlanId, string> = {
	individual: "pdt_0NfmfWinEiPodeNWGQ3ul",
	teams: "pdt_0NfmfhPh81Fgklfe8WgQz",
	teams_pro: "pdt_0Nfmg1rLmulqhqBBM2KHW",
};

export function resolveProductId(
	planId: CheckoutPlanId,
	interval: BillingInterval,
) {
	if (interval === "yearly") {
		if (planId === "individual" && env.DODO_PRODUCT_ID_INDIVIDUAL_YEARLY) {
			return env.DODO_PRODUCT_ID_INDIVIDUAL_YEARLY;
		}
		if (planId === "teams" && env.DODO_PRODUCT_ID_TEAMS_YEARLY) {
			return env.DODO_PRODUCT_ID_TEAMS_YEARLY;
		}
		if (planId === "teams_pro" && env.DODO_PRODUCT_ID_TEAMS_PRO_YEARLY) {
			return env.DODO_PRODUCT_ID_TEAMS_PRO_YEARLY;
		}
		return dodoLive(env.DEPLOYMENT)
			? DODO_LIVE_PLAN_PRODUCT_IDS_YEARLY[planId]
			: DODO_TEST_PLAN_PRODUCT_IDS_YEARLY[planId];
	}
	if (planId === "individual" && env.DODO_PRODUCT_ID_INDIVIDUAL_MONTHLY) {
		return env.DODO_PRODUCT_ID_INDIVIDUAL_MONTHLY;
	}
	if (planId === "teams" && env.DODO_PRODUCT_ID_TEAMS_MONTHLY) {
		return env.DODO_PRODUCT_ID_TEAMS_MONTHLY;
	}
	if (planId === "teams_pro" && env.DODO_PRODUCT_ID_TEAMS_PRO_MONTHLY) {
		return env.DODO_PRODUCT_ID_TEAMS_PRO_MONTHLY;
	}
	return dodoLive(env.DEPLOYMENT)
		? DODO_LIVE_PLAN_PRODUCT_IDS[planId]
		: DODO_TEST_PLAN_PRODUCT_IDS[planId];
}

export async function createBillingCheckoutSession(_args: {
	wallet: Address;
	planId: CheckoutPlanId;
	interval: BillingInterval;
	returnUrl: string;
}): Promise<{ checkoutUrl: string; sessionId: string }> {
	throw new ORPCError("BAD_REQUEST", {
		message:
			"Subscriptions are billed per workspace. Open Workspace Settings → Billing.",
	});
}

export async function createBillingPortalSession(_args: {
	wallet: Address;
}): Promise<{ url: string }> {
	throw new ORPCError("BAD_REQUEST", {
		message:
			"Manage billing from Workspace Settings. Personal and team plans are billed per workspace.",
	});
}
