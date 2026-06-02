import "@/lib/platform/polyfills/bigint-json";
import { getRedis } from "@/lib/platform/cache/session-cache";

const inflight = new Map<string, Promise<unknown>>();

export type CacheAsideOptions<T> = {
	key: string;
	ttlSec: number;
	fetch: () => Promise<T>;
	serialize?: (value: T) => string;
	deserialize?: (raw: string) => T;
};

export function defaultSerialize<T>(value: T): string {
	return JSON.stringify(value);
}

export function defaultDeserialize<T>(raw: string): T {
	return JSON.parse(raw) as T;
}

/**
 * Cache-aside read-through with single-flight per key and corrupt-entry refetch.
 */
export async function cacheAside<T>(options: CacheAsideOptions<T>): Promise<T> {
	const existing = inflight.get(options.key);
	if (existing) {
		return existing as Promise<T>;
	}

	const run = (async (): Promise<T> => {
		const redis = getRedis();
		const cached = await redis.get(options.key);

		if (cached) {
			try {
				const deserialize = options.deserialize ?? defaultDeserialize<T>;
				return deserialize(cached);
			} catch {
				// Corrupt payload — treat as miss and refetch.
			}
		}

		const value = await options.fetch();
		const serialize = options.serialize ?? defaultSerialize;
		const encoded = serialize(value);
		await redis.send("SET", [
			options.key,
			encoded,
			"EX",
			String(options.ttlSec),
		]);
		return value;
	})();

	inflight.set(options.key, run);
	try {
		return await run;
	} finally {
		inflight.delete(options.key);
	}
}

export async function cacheDel(key: string): Promise<void> {
	await getRedis().send("DEL", [key]);
}

export async function cacheDelMany(keys: string[]): Promise<void> {
	if (keys.length === 0) return;
	await getRedis().send("DEL", keys);
}
