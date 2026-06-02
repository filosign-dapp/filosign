import { afterAll, describe, expect, mock, test } from "bun:test";
import { createMockRedis, mockSessionCacheRedis } from "../support/mock-redis";

const { client, store } = createMockRedis();
mockSessionCacheRedis(client);

afterAll(() => {
	mock.restore();
});

describe("cache-aside", () => {
	test("defaultSerialize handles BigInt values", async () => {
		const { defaultSerialize, defaultDeserialize } = await import(
			"@/lib/platform/cache/aside"
		);
		const raw = defaultSerialize({ n: 42n });
		expect(raw).toBe('{"n":"42"}');
		expect(defaultDeserialize<{ n: string }>(raw).n).toBe("42");
	});

	test("returns cached value without calling fetch again", async () => {
		store.clear();
		const { cacheAside } = await import("@/lib/platform/cache/aside");
		let fetches = 0;
		const value = await cacheAside({
			key: "fs:test:hit",
			ttlSec: 60,
			fetch: async () => {
				fetches += 1;
				return { ok: true };
			},
		});
		expect(value).toEqual({ ok: true });
		expect(fetches).toBe(1);

		const cached = await cacheAside({
			key: "fs:test:hit",
			ttlSec: 60,
			fetch: async () => {
				fetches += 1;
				return { ok: false };
			},
		});
		expect(cached).toEqual({ ok: true });
		expect(fetches).toBe(1);
	});

	test("refetches when cached JSON is corrupt", async () => {
		store.clear();
		store.set("fs:test:corrupt", "not-json{{{");
		const { cacheAside } = await import("@/lib/platform/cache/aside");
		let fetches = 0;
		const value = await cacheAside({
			key: "fs:test:corrupt",
			ttlSec: 60,
			fetch: async () => {
				fetches += 1;
				return "fresh";
			},
		});
		expect(value).toBe("fresh");
		expect(fetches).toBe(1);
	});

	test("single-flight: concurrent misses share one fetch", async () => {
		store.clear();
		const { cacheAside } = await import("@/lib/platform/cache/aside");
		let fetches = 0;
		const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
		const results = await Promise.all([
			cacheAside({
				key: "fs:test:flight",
				ttlSec: 60,
				fetch: async () => {
					fetches += 1;
					await delay(20);
					return fetches;
				},
			}),
			cacheAside({
				key: "fs:test:flight",
				ttlSec: 60,
				fetch: async () => {
					fetches += 1;
					await delay(20);
					return fetches;
				},
			}),
		]);
		expect(results[0]).toBe(1);
		expect(results[1]).toBe(1);
		expect(fetches).toBe(1);
	});
});
