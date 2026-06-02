import { afterAll, describe, expect, mock, test } from "bun:test";
import { createMockRedis, mockSessionCacheRedis } from "../support/mock-redis";

const { client, store } = createMockRedis();
mockSessionCacheRedis(client);

afterAll(() => {
	mock.restore();
});

describe("worker heartbeat", () => {
	test("writeWorkerHeartbeat stores ISO timestamp with TTL key", async () => {
		store.clear();
		const { WORKER_HEARTBEAT_KEY, writeWorkerHeartbeat } = await import(
			"@/lib/platform/worker/heartbeat"
		);
		await writeWorkerHeartbeat();
		const raw = store.get(WORKER_HEARTBEAT_KEY);
		expect(raw).toBeDefined();
		expect(Number.isNaN(Date.parse(raw ?? ""))).toBe(false);
	});

	test("checkWorkerHeartbeatFresh accepts recent heartbeat", async () => {
		store.clear();
		const {
			WORKER_HEARTBEAT_KEY,
			checkWorkerHeartbeatFresh,
			writeWorkerHeartbeat,
		} = await import("@/lib/platform/worker/heartbeat");
		await writeWorkerHeartbeat();
		expect(store.has(WORKER_HEARTBEAT_KEY)).toBe(true);
		expect(await checkWorkerHeartbeatFresh()).toBe(true);
	});

	test("checkWorkerHeartbeatFresh rejects missing or stale heartbeat", async () => {
		store.clear();
		const { WORKER_HEARTBEAT_KEY, checkWorkerHeartbeatFresh } = await import(
			"@/lib/platform/worker/heartbeat"
		);
		expect(await checkWorkerHeartbeatFresh()).toBe(false);
		store.set(
			WORKER_HEARTBEAT_KEY,
			new Date(Date.now() - 120_000).toISOString(),
		);
		expect(await checkWorkerHeartbeatFresh()).toBe(false);
	});
});
