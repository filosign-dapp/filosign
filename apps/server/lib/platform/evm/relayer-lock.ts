import { createHash, randomBytes } from "node:crypto";
import { getAddress } from "viem";
import env from "@/env";
import { getRedis } from "@/lib/platform/cache/session";
import { logger } from "@/lib/platform/pino";

/** Base TTL per acquire; extended via heartbeat while work runs (up to max hold). */
export const RELAYER_LOCK_TTL_SEC = 30;

export const RELAYER_LOCK_MAX_HOLD_MS = 5 * 60 * 1000;

const RELAYER_LOCK_HEARTBEAT_MS = 15_000;

const MAX_ACQUIRE_ATTEMPTS = 120;
const ACQUIRE_BASE_DELAY_MS = 50;

const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

const EXTEND_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("expire", KEYS[1], ARGV[2])
else
  return 0
end
`;

export function relayerLockKey(): string {
	return `fs:lock:relayer:${getAddress(env.FC_SERVER_ADDRESS).toLowerCase()}`;
}

function lockToken(): string {
	return createHash("sha256").update(randomBytes(16)).digest("hex");
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireRelayerLock(token: string): Promise<boolean> {
	const key = relayerLockKey();
	for (let attempt = 0; attempt < MAX_ACQUIRE_ATTEMPTS; attempt += 1) {
		const acquired = await getRedis().send("SET", [
			key,
			token,
			"NX",
			"EX",
			String(RELAYER_LOCK_TTL_SEC),
		]);
		if (acquired === "OK") return true;
		await sleep(ACQUIRE_BASE_DELAY_MS + Math.min(attempt, 40) * 25);
	}
	return false;
}

async function releaseRelayerLock(token: string): Promise<void> {
	const key = relayerLockKey();
	try {
		await getRedis().send("EVAL", [RELEASE_LOCK_SCRIPT, "1", key, token]);
	} catch (err) {
		logger.warn({ err, key }, "relayer lock release failed");
	}
}

async function extendRelayerLock(token: string): Promise<void> {
	const key = relayerLockKey();
	try {
		await getRedis().send("EVAL", [
			EXTEND_LOCK_SCRIPT,
			"1",
			key,
			token,
			String(RELAYER_LOCK_TTL_SEC),
		]);
	} catch (err) {
		logger.warn({ err, key }, "relayer lock extend failed");
	}
}

/**
 * Serializes all writes from FC_SERVER relayer to avoid EVM nonce collisions.
 */
export async function withRelayerLock<T>(run: () => Promise<T>): Promise<T> {
	const token = lockToken();
	const acquired = await acquireRelayerLock(token);
	if (!acquired) {
		throw new Error("relayer lock unavailable after retries");
	}
	const startedAt = Date.now();
	const heartbeat = setInterval(() => {
		if (Date.now() - startedAt > RELAYER_LOCK_MAX_HOLD_MS) return;
		void extendRelayerLock(token);
	}, RELAYER_LOCK_HEARTBEAT_MS);
	try {
		return await run();
	} finally {
		clearInterval(heartbeat);
		await releaseRelayerLock(token);
	}
}
