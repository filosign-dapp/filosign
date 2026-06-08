import type { Address } from "viem";
import { getAddress } from "viem";

/** TTLs (seconds) — Tier 1 cache-aside. */
export const CACHE_TTL = {
	orgEntitlements: 60 * 60,
	userEntitlements: 60 * 60,
	userOrgs: 10 * 60,
	orgMember: 10 * 60,
	userExists: 10 * 60,
	orgTemplates: 5 * 60,
	notificationsInbox: 30,
} as const;

export const cacheKeys = {
	orgEntitlements: (orgId: string) => `fs:org-entitlements:${orgId}`,
	userEntitlements: (wallet: Address) =>
		`fs:user-entitlements:${getAddress(wallet)}`,
	userOrgs: (wallet: Address) => `fs:user-orgs:${getAddress(wallet)}`,
	orgMember: (orgId: string, wallet: Address) =>
		`fs:org:member:${orgId}:${getAddress(wallet)}`,
	userExists: (wallet: Address) => `fs:user:exists:${getAddress(wallet)}`,
	orgTemplates: (orgId: string) => `fs:org-templates:${orgId}`,
	notificationsInbox: (wallet: Address, limit: number) =>
		`fs:notifications:inbox:${getAddress(wallet)}:${limit}`,
} as const;
