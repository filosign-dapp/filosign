import type { Address } from "viem";
import { getAddress } from "viem";
import { cacheDel, cacheDelMany } from "@/lib/platform/cache/cache-aside";
import { cacheKeys } from "@/lib/platform/cache/cache-keys";

/** Billing / admin: drop org entitlement snapshot (Sprint 5 webhooks call this after sync). */
export async function invalidateOrgEntitlements(orgId: string): Promise<void> {
	await cacheDel(cacheKeys.orgEntitlements(orgId));
}

export async function invalidateUserOrgs(wallet: Address): Promise<void> {
	await cacheDel(cacheKeys.userOrgs(getAddress(wallet)));
}

export async function invalidateOrgMember(
	orgId: string,
	wallet: Address,
): Promise<void> {
	await cacheDel(cacheKeys.orgMember(orgId, getAddress(wallet)));
}

export async function invalidateOrgTemplates(orgId: string): Promise<void> {
	await cacheDel(cacheKeys.orgTemplates(orgId));
}

export async function invalidateUserExists(wallet: Address): Promise<void> {
	await cacheDel(cacheKeys.userExists(getAddress(wallet)));
}

/** Membership or invite-claim: org entitlements, user's org list, and active-org row. */
export async function invalidateOnMembershipChange(
	orgId: string,
	wallet: Address,
): Promise<void> {
	const w = getAddress(wallet);
	await cacheDelMany([
		cacheKeys.orgEntitlements(orgId),
		cacheKeys.userOrgs(w),
		cacheKeys.orgMember(orgId, w),
	]);
}
