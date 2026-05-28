import type { Address } from "viem";
import { getAddress } from "viem";
import {
	type BillingInterval,
	createBillingCheckoutSession,
	createBillingPortalSession,
} from "@/lib/domains/billing";
import {
	buildEntitlementsSnapshot,
	resolveEntitlementContext,
} from "@/lib/domains/entitlements";

export async function billingEntitlements(wallet: Address) {
	const ctx = await resolveEntitlementContext(getAddress(wallet));
	return buildEntitlementsSnapshot(ctx);
}

export async function billingCreateCheckoutSession(args: {
	wallet: Address;
	planId: "individual" | "teams" | "teams_pro";
	interval: BillingInterval;
	returnUrl: string;
}) {
	return createBillingCheckoutSession(args);
}

export async function billingCreatePortalSession(wallet: Address) {
	return createBillingPortalSession({ wallet });
}
