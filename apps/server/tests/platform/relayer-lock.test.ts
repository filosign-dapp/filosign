import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { getAddress } from "viem";
import { testEnvStub } from "../support/env-stub";
import { createMockRedis, mockSessionCacheRedis } from "../support/mock-redis";

afterAll(() => {
	mock.restore();
});

describe("withRelayerLock", () => {
	beforeEach(() => {
		mock.module("@/env", () => ({ default: testEnvStub }));
		const { client, store } = createMockRedis();
		mockSessionCacheRedis(client);
		store.clear();
	});

	test("serializes concurrent relayer work on one address", async () => {
		const { withRelayerLock, relayerLockKey } = await import(
			"@/lib/platform/evm/relayer-lock"
		);
		const relayer = getAddress(testEnvStub.FC_SERVER_ADDRESS);
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
			`fs:lock:relayer:${testEnvStub.FC_SERVER_ADDRESS.toLowerCase()}`,
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
