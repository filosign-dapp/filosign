import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
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

	test("serializes concurrent relayer work on one key", async () => {
		const { withRelayerLock, relayerLockKey } = await import(
			"@/lib/platform/evm/relayer-lock"
		);
		const order: string[] = [];
		let releaseFirst!: () => void;
		const gate = new Promise<void>((resolve) => {
			releaseFirst = resolve;
		});

		const first = withRelayerLock(async () => {
			order.push("first");
			await gate;
		});

		await new Promise((r) => setTimeout(r, 20));
		const second = withRelayerLock(async () => {
			order.push("second");
		});

		releaseFirst();
		await Promise.all([first, second]);
		expect(order).toEqual(["first", "second"]);
		expect(relayerLockKey()).toBe(
			`fs:lock:relayer:${testEnvStub.FC_SERVER_ADDRESS.toLowerCase()}`,
		);
	});
});
