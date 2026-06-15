import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockRedis, mockSessionCacheRedis } from "../support/mock-redis";

afterAll(() => {
	mock.restore();
});

describe("withRegisterPieceLock", () => {
	beforeEach(() => {
		const { client, store } = createMockRedis();
		mockSessionCacheRedis(client);
		store.clear();
	});

	test("serializes concurrent register work for one pieceCid", async () => {
		const { withRegisterPieceLock } = await import(
			"@/lib/platform/evm/register-piece-lock"
		);
		const pieceCid = "bafyREGISTER";
		let relayCount = 0;
		let releaseFirst!: () => void;
		const gate = new Promise<void>((resolve) => {
			releaseFirst = resolve;
		});

		const first = withRegisterPieceLock(pieceCid, async () => {
			relayCount += 1;
			await gate;
		});

		await new Promise((r) => setTimeout(r, 20));
		const second = withRegisterPieceLock(pieceCid, async () => {
			relayCount += 1;
		});

		releaseFirst();
		await Promise.all([first, second]);
		expect(relayCount).toBe(2);
	});
});
