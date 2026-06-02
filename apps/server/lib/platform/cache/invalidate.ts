import type { Address } from "viem";
import { getAddress } from "viem";
import { cacheDel } from "@/lib/platform/cache/cache-aside";
import { cacheKeys } from "@/lib/platform/cache/cache-keys";

/** Drop org entitlement snapshot after billing or send-count changes. */
export async function invalidateOrgEntitlements(orgId: string): Promise<void> {
	await cacheDel(cacheKeys.orgEntitlements(orgId));
}

/** Drop wallet-only entitlement snapshot (no active org context). */
export async function invalidateUserEntitlements(
	wallet: Address,
): Promise<void> {
	await cacheDel(cacheKeys.userEntitlements(getAddress(wallet)));
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

/** After register send or subscription mutation — org-scoped vs personal sender. */
export async function invalidateEntitlementsForFileSend(args: {
	sender: Address;
	organizationId: string | null | undefined;
}): Promise<void> {
	const orgId = args.organizationId?.trim();
	if (orgId) {
		await invalidateOrgEntitlements(orgId);
		return;
	}
	await invalidateUserEntitlements(getAddress(args.sender));
}

export type EntitlementCacheInvalidation = {
	orgIds: Set<string>;
	wallets: Set<Address>;
};

export function createEntitlementCacheInvalidation(): EntitlementCacheInvalidation {
	return { orgIds: new Set(), wallets: new Set() };
}

export async function flushEntitlementCacheInvalidation(
	targets: EntitlementCacheInvalidation,
): Promise<void> {
	await Promise.all([
		...targets.orgIds.values().map((orgId) => invalidateOrgEntitlements(orgId)),
		...targets.wallets
			.values()
			.map((wallet) => invalidateUserEntitlements(wallet)),
	]);
}

/** Membership or invite-claim: org entitlements, user's org list, and active-org row. */
export async function invalidateOnMembershipChange(
	orgId: string,
	wallet: Address,
): Promise<void> {
	const w = getAddress(wallet);
	await Promise.all([
		invalidateOrgEntitlements(orgId),
		invalidateUserOrgs(w),
		invalidateOrgMember(orgId, w),
	]);
}
