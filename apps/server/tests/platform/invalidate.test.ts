import { beforeAll, describe, expect, test } from "bun:test";
import { getAddress } from "viem";
import {
	flushEntitlementCacheInvalidation,
	invalidateEntitlementsForFileSend,
} from "@/lib/platform/cache/invalidate";
import { cacheKeys } from "@/lib/platform/cache/keys";
import { createMockRedis, mockSessionCacheRedis } from "../support/mock-redis";

const { client, store } = createMockRedis();

describe("entitlement cache invalidation", () => {
	beforeAll(() => {
		mockSessionCacheRedis(client);
	});
	test("flushEntitlementCacheInvalidation deletes org and user keys", async () => {
		store.clear();
		const orgId = "00000000-0000-7000-8000-000000000099";
		const wallet = getAddress("0x0000000000000000000000000000000000000001");
		store.set(cacheKeys.orgEntitlements(orgId), "{}");
		store.set(cacheKeys.userEntitlements(wallet), "{}");

		await flushEntitlementCacheInvalidation({
			orgIds: new Set([orgId]),
			wallets: new Set([wallet]),
		});

		expect(store.has(cacheKeys.orgEntitlements(orgId))).toBe(false);
		expect(store.has(cacheKeys.userEntitlements(wallet))).toBe(false);
	});

	test("invalidateEntitlementsForFileSend targets org or user key", async () => {
		store.clear();
		const orgId = "00000000-0000-7000-8000-000000000099";
		const wallet = getAddress("0x0000000000000000000000000000000000000001");
		store.set(cacheKeys.orgEntitlements(orgId), "{}");
		store.set(cacheKeys.userEntitlements(wallet), "{}");

		await invalidateEntitlementsForFileSend({
			sender: wallet,
			organizationId: orgId,
		});
		expect(store.has(cacheKeys.orgEntitlements(orgId))).toBe(false);
		expect(store.has(cacheKeys.userEntitlements(wallet))).toBe(true);

		store.set(cacheKeys.userEntitlements(wallet), "{}");
		await invalidateEntitlementsForFileSend({
			sender: wallet,
			organizationId: null,
		});
		expect(store.has(cacheKeys.userEntitlements(wallet))).toBe(false);
	});
});
