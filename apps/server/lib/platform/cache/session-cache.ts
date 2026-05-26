import { createHash } from "node:crypto";
import { RedisClient } from "bun";
import type { Address } from "viem";
import env from "@/env";

const TTL_SEC = 300;

export type CachedSession = {
	wallet: Address;
	userId: string;
	email: string;
};

let redis: RedisClient | null = null;

export function getRedis(): RedisClient {
	if (!redis) redis = new RedisClient(env.DRAGONFLY_URL);
	return redis;
}

export async function initCache(): Promise<void> {
	await getRedis().send("PING", []);
}

/** Wipe Dragonfly (dev only). Run after `db purge` so Redis does not outlive Postgres. */
export async function flushDevCache(): Promise<void> {
	await getRedis().send("FLUSHDB", []);
}

function sessionKey(token: string): string {
	return `fs:session:${createHash("sha256").update(token).digest("hex")}`;
}

export async function getCachedSession(
	token: string,
): Promise<CachedSession | null> {
	const raw = await getRedis().get(sessionKey(token));
	if (!raw) return null;
	try {
		return JSON.parse(raw) as CachedSession;
	} catch {
		return null;
	}
}

export async function setCachedSession(
	token: string,
	session: CachedSession,
): Promise<void> {
	await getRedis().send("SET", [
		sessionKey(token),
		JSON.stringify(session),
		"EX",
		String(TTL_SEC),
	]);
}

export async function assertVerifyRateLimit(id: string): Promise<void> {
	const r = getRedis();
	const key = `fs:verify-rl:${id}`;
	const n = await r.incr(key);
	if (n === 1) await r.expire(key, 60);
	if (n > 30) throw new Error("Too many verification attempts");
}
