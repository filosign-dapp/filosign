import { ORPCError } from "@orpc/server";
import DodoPayments from "dodopayments";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import env from "@/env";
import db from "@/lib/platform/db";
import {
	type SubscriptionPlanId,
	userSubscriptions,
} from "@/lib/platform/db/schema/billing";
import { users } from "@/lib/platform/db/schema/user";
import { isAllowedReturnUrlOrigin } from "./policy";

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

function requireDodoApiKey(): string {
	if (!env.DODO_API_KEY) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Dodo Payments is not configured",
		});
	}
	return env.DODO_API_KEY;
}

function createDodoClient() {
	const apiKey = requireDodoApiKey();
	return new DodoPayments({
		bearerToken: apiKey,
		environment: env.DODO_LIVE ? "live_mode" : "test_mode",
	});
}

function resolveProductId(planId: CheckoutPlanId, interval: BillingInterval) {
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
		return env.DODO_LIVE
			? DODO_LIVE_PLAN_PRODUCT_IDS_YEARLY[planId]
			: DODO_TEST_PLAN_PRODUCT_IDS_YEARLY[planId];
	} else {
		if (planId === "individual" && env.DODO_PRODUCT_ID_INDIVIDUAL_MONTHLY) {
			return env.DODO_PRODUCT_ID_INDIVIDUAL_MONTHLY;
		}
		if (planId === "teams" && env.DODO_PRODUCT_ID_TEAMS_MONTHLY) {
			return env.DODO_PRODUCT_ID_TEAMS_MONTHLY;
		}
		if (planId === "teams_pro" && env.DODO_PRODUCT_ID_TEAMS_PRO_MONTHLY) {
			return env.DODO_PRODUCT_ID_TEAMS_PRO_MONTHLY;
		}
		return env.DODO_LIVE
			? DODO_LIVE_PLAN_PRODUCT_IDS[planId]
			: DODO_TEST_PLAN_PRODUCT_IDS[planId];
	}
}

function assertAllowedReturnUrl(url: string) {
	if (
		!isAllowedReturnUrlOrigin({
			returnUrl: url,
			clientUrl: env.CLIENT_URL,
			allowedOrigins: env.BILLING_RETURN_URL_ORIGINS,
		})
	) {
		throw new ORPCError("BAD_REQUEST", {
			message: "returnUrl origin is not allowed",
		});
	}
}

function buildCustomerName(firstName: string | null, lastName: string | null) {
	const full = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ");
	if (full) return full;
	return "Filosign user";
}

async function getOrCreateDodoCustomer(wallet: Address): Promise<string> {
	const walletNorm = getAddress(wallet);
	const [existing] = await db
		.select({ dodoCustomerId: userSubscriptions.dodoCustomerId })
		.from(userSubscriptions)
		.where(eq(userSubscriptions.walletAddress, walletNorm))
		.limit(1);

	if (existing?.dodoCustomerId) return existing.dodoCustomerId;

	const [user] = await db
		.select({
			email: users.email,
			firstName: users.firstName,
			lastName: users.lastName,
		})
		.from(users)
		.where(eq(users.walletAddress, walletNorm))
		.limit(1);

	if (!user?.email) {
		throw new ORPCError("BAD_REQUEST", {
			message: "User email is required for checkout",
		});
	}

	const client = createDodoClient();
	let customerId: string;
	try {
		const customer = (await client.customers.create({
			email: user.email,
			name: buildCustomerName(user.firstName, user.lastName),
			metadata: {
				filosign_wallet: walletNorm,
			},
		})) as { customer_id: string };
		customerId = customer.customer_id;
	} catch (error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to create Dodo customer",
			cause: error,
		});
	}

	await db
		.insert(userSubscriptions)
		.values({
			walletAddress: walletNorm,
			dodoCustomerId: customerId,
			provider: "dodo",
			planId: "free",
		})
		.onConflictDoUpdate({
			target: userSubscriptions.walletAddress,
			set: {
				dodoCustomerId: customerId,
				provider: "dodo",
				updatedAt: new Date(),
			},
		});

	return customerId;
}

export async function createBillingCheckoutSession(args: {
	wallet: Address;
	planId: CheckoutPlanId;
	interval: BillingInterval;
	returnUrl: string;
}): Promise<{ checkoutUrl: string; sessionId: string }> {
	assertAllowedReturnUrl(args.returnUrl);

	const walletNorm = getAddress(args.wallet);
	const productId = resolveProductId(args.planId, args.interval);
	const customerId = await getOrCreateDodoCustomer(walletNorm);
	const client = createDodoClient();

	let checkout: {
		session_id: string;
		url?: string | null;
		checkout_url?: string | null;
	};
	try {
		checkout = (await client.checkoutSessions.create({
			product_cart: [{ product_id: productId, quantity: 1 }],
			customer: { customer_id: customerId },
			return_url: args.returnUrl,
			metadata: {
				filosign_wallet: walletNorm,
				filosign_plan_id: args.planId,
				filosign_interval: args.interval,
			},
		})) as {
			session_id: string;
			url?: string | null;
			checkout_url?: string | null;
		};
	} catch (error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to create Dodo checkout session",
			cause: error,
		});
	}

	const checkoutUrl = checkout.url ?? checkout.checkout_url;
	if (!checkoutUrl) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Dodo checkout URL was not returned",
		});
	}

	return {
		checkoutUrl,
		sessionId: checkout.session_id,
	};
}

export async function createBillingPortalSession(args: {
	wallet: Address;
}): Promise<{ url: string }> {
	const walletNorm = getAddress(args.wallet);
	const [sub] = await db
		.select({ dodoCustomerId: userSubscriptions.dodoCustomerId })
		.from(userSubscriptions)
		.where(
			and(
				eq(userSubscriptions.walletAddress, walletNorm),
				eq(userSubscriptions.provider, "dodo"),
			),
		)
		.limit(1);

	if (!sub?.dodoCustomerId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "No Dodo customer found for this wallet",
		});
	}

	const client = createDodoClient();
	try {
		const portal = (await client.customers.customerPortal.create(
			sub.dodoCustomerId,
			{},
		)) as {
			link: string;
			url?: string;
		};
		return { url: portal.url ?? portal.link };
	} catch (error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to create Dodo portal session",
			cause: error,
		});
	}
}
