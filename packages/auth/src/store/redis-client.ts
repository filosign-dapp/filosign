import { RedisClient } from "bun";

/** Thin Bun Redis wrapper used by the auth store and rate limiter. */
export type AuthRedis = {
	readonly client: RedisClient;
	setex(key: string, value: string, ttlSeconds: number): Promise<void>;
	get(key: string): Promise<string | null>;
	getdel(key: string): Promise<string | null>;
	del(...keys: string[]): Promise<void>;
	exists(key: string): Promise<boolean>;
	sadd(key: string, member: string): Promise<void>;
	smembers(key: string): Promise<string[]>;
	incr(key: string): Promise<number>;
	expire(key: string, ttlSeconds: number): Promise<void>;
	ttlMs(key: string): Promise<number>;
	transaction(ops: Array<{ command: string; args: string[] }>): Promise<void>;
	close(): void;
};

function asString(value: unknown): string | null {
	if (value === null || value === undefined) return null;
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	return null;
}

function asStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.map((v) => String(v));
}

export function createAuthRedis(url: string): AuthRedis {
	const client = new RedisClient(url, {
		maxRetries: 10,
		autoReconnect: true,
		enableOfflineQueue: true,
	});

	return {
		client,

		async setex(key, value, ttlSeconds) {
			await client.send("SET", [key, value, "EX", String(ttlSeconds)]);
		},

		async get(key) {
			return asString(await client.get(key));
		},

		async getdel(key) {
			return asString(await client.send("GETDEL", [key]));
		},

		async del(...keys) {
			if (keys.length === 0) return;
			if (keys.length === 1 && keys[0] !== undefined) {
				await client.del(keys[0]);
				return;
			}
			await client.send("DEL", keys);
		},

		async exists(key) {
			return client.exists(key);
		},

		async sadd(key, member) {
			await client.sadd(key, member);
		},

		async smembers(key) {
			return asStringArray(await client.smembers(key));
		},

		async incr(key) {
			return client.incr(key);
		},

		async expire(key, ttlSeconds) {
			await client.expire(key, ttlSeconds);
		},

		async ttlMs(key) {
			const seconds = await client.ttl(key);
			if (seconds < 0) return 0;
			return seconds * 1000;
		},

		async transaction(ops) {
			await client.send("MULTI", []);
			for (const op of ops) {
				await client.send(op.command, op.args);
			}
			const result = await client.send("EXEC", []);
			if (result === null) {
				throw new Error("Redis MULTI/EXEC returned null (aborted)");
			}
		},

		close() {
			client.close();
		},
	};
}
