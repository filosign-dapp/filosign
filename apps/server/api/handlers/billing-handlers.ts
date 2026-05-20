import type { Address } from "viem";
import { getAddress } from "viem";
import {
	buildEntitlementsSnapshot,
	resolveEntitlementContext,
} from "@/lib/domains/entitlements";

export async function billingEntitlements(wallet: Address) {
	const ctx = await resolveEntitlementContext(getAddress(wallet));
	return buildEntitlementsSnapshot(ctx);
}
