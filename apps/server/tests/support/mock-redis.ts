import { mock } from "bun:test";

/** In-memory Redis stub for cache-aside unit tests. */
export function createMockRedis() {
	const store = new Map<string, string>();

	return {
		store,
		client: {
			get: async (key: string) => store.get(key) ?? null,
			del: async (...keys: string[]) => {
				let removed = 0;
				for (const key of keys) {
					if (store.delete(key)) removed += 1;
				}
				return removed;
			},
			send: async (cmd: string, args: string[]) => {
				if (cmd === "SET" && args[0] !== undefined && args[1] !== undefined) {
					const nx = args.includes("NX");
					if (nx && store.has(args[0])) return null;
					store.set(args[0], args[1]);
					return "OK";
				}
				if (cmd === "DEL") {
					for (const key of args) store.delete(key);
					return args.length;
				}
				return null;
			},
		},
	};
}

/** Override Dragonfly `getRedis` while keeping session-cache exports. */
export function mockSessionCacheRedis(
	client: ReturnType<typeof createMockRedis>["client"],
) {
	mock.module("@/lib/platform/cache/session-cache", () => ({
		getRedis: () => client,
		initCache: async () => {},
		flushDevCache: async () => {},
		getCachedSession: async () => null,
		setCachedSession: async () => {},
		assertVerifyRateLimit: async () => {},
	}));
}
