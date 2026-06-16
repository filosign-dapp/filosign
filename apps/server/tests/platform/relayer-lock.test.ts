import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { getAddress } from "viem";
import { testEnvStub } from "../support/env-stub";
import { createMockRedis, mockSessionCacheRedis } from "../support/mock-redis";

afterAll(() => {
	mock.restore();
});

function stubRelayerEnv() {
	mock.module("@/env", () => ({ default: testEnvStub }));
}

describe("withRelayerLock", () => {
	beforeEach(() => {
		stubRelayerEnv();
		const { client, store } = createMockRedis();
		mockSessionCacheRedis(client);
		store.clear();
	});

	test("serializes concurrent relayer work on one address", async () => {
		const { withRelayerLock, relayerLockKey } = await import(
			"@/lib/platform/evm/relayer-lock"
		);
		const relayer = getAddress(testEnvStub.RELAYER_POOL.split(",")[0]);
		const order: string[] = [];
		let releaseFirst!: () => void;
		const gate = new Promise<void>((resolve) => {
			releaseFirst = resolve;
		});

		const first = withRelayerLock(relayer, async () => {
			order.push("first");
			await gate;
		});

		await new Promise((r) => setTimeout(r, 20));
		const second = withRelayerLock(relayer, async () => {
			order.push("second");
		});

		releaseFirst();
		await Promise.all([first, second]);
		expect(order).toEqual(["first", "second"]);
		expect(relayerLockKey(relayer)).toBe(
			`fs:lock:relayer:${testEnvStub.RELAYER_POOL.split(",")[0].toLowerCase()}`,
		);
	});

	test("allows independent locks for different relayer addresses", async () => {
		const { withRelayerLock } = await import("@/lib/platform/evm/relayer-lock");
		const relayerA = getAddress("0x1111111111111111111111111111111111111111");
		const relayerB = getAddress("0x2222222222222222222222222222222222222222");
		const order: string[] = [];
		let releaseFirst!: () => void;
		const gate = new Promise<void>((resolve) => {
			releaseFirst = resolve;
		});

		const first = withRelayerLock(relayerA, async () => {
			order.push("a");
			await gate;
		});

		await new Promise((r) => setTimeout(r, 20));
		const second = withRelayerLock(relayerB, async () => {
			order.push("b");
		});

		await Promise.race([second, new Promise((r) => setTimeout(r, 50))]);
		expect(order).toEqual(["a", "b"]);
		releaseFirst();
		await first;
	});
});

describe("relayer-pool", () => {
	beforeEach(() => {
		stubRelayerEnv();
	});

	test("routeRelayerForNewPiece is stable rendezvous on pieceCid", async () => {
		const {
			routeRelayerForNewPiece,
			parseRelayerPool,
			resetRelayerPoolCacheForTests,
		} = await import("@/lib/platform/evm/relayer-pool");

		resetRelayerPoolCacheForTests();
		parseRelayerPool();
		const pieceCid = "bafyrendezvous";
		const first = routeRelayerForNewPiece(pieceCid);
		const second = routeRelayerForNewPiece(pieceCid);
		expect(second.address).toBe(first.address);
	});

	test("routeRelayerForPiece reuses pinned relayer address", async () => {
		const {
			routeRelayerForPiece,
			parseRelayerPool,
			resetRelayerPoolCacheForTests,
		} = await import("@/lib/platform/evm/relayer-pool");
		resetRelayerPoolCacheForTests();
		parseRelayerPool();
		const pinned = getAddress(testEnvStub.RELAYER_POOL.split(",")[1]);
		const routed = routeRelayerForPiece({
			pieceCid: "bafypinned",
			pinnedRelayerAddress: pinned,
		});
		expect(routed.address).toBe(pinned);
	});

	test("routeRelayerForOrg reuses pinned relayer address", async () => {
		const {
			routeRelayerForOrg,
			parseRelayerPool,
			resetRelayerPoolCacheForTests,
		} = await import("@/lib/platform/evm/relayer-pool");
		resetRelayerPoolCacheForTests();
		parseRelayerPool();
		const pinned = getAddress(testEnvStub.RELAYER_POOL.split(",")[0]);
		const routed = routeRelayerForOrg({
			organizationId: "org-stable-pin",
			pinnedRelayerAddress: pinned,
		});
		expect(routed.address).toBe(pinned);
	});

	test("routeRelayerForOrg rendezvous is stable on organizationId", async () => {
		const {
			routeRelayerForOrg,
			parseRelayerPool,
			resetRelayerPoolCacheForTests,
		} = await import("@/lib/platform/evm/relayer-pool");
		resetRelayerPoolCacheForTests();
		parseRelayerPool();
		const orgId = "org-rendezvous";
		const first = routeRelayerForOrg({
			organizationId: orgId,
			pinnedRelayerAddress: null,
		});
		const second = routeRelayerForOrg({
			organizationId: orgId,
			pinnedRelayerAddress: null,
		});
		expect(second.address).toBe(first.address);
	});

	test("relayerFailoverMembers rotates from primary index", async () => {
		const {
			parseRelayerPool,
			relayerFailoverMembers,
			resetRelayerPoolCacheForTests,
		} = await import("@/lib/platform/evm/relayer-pool");
		resetRelayerPoolCacheForTests();
		const pool = parseRelayerPool();
		const primary = pool[1];
		const ordered = relayerFailoverMembers(primary).map((m) => m.address);
		expect(ordered[0]).toBe(primary.address);
		expect(new Set(ordered).size).toBe(pool.length);
	});
});
