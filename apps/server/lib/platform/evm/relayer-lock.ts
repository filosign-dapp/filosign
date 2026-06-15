import { createHash, randomBytes } from "node:crypto";
import { type Address, getAddress } from "viem";
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

export function relayerLockKey(relayerAddress: Address): string {
	return `fs:lock:relayer:${getAddress(relayerAddress).toLowerCase()}`;
}

function lockToken(): string {
	return createHash("sha256").update(randomBytes(16)).digest("hex");
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireRelayerLock(
	relayerAddress: Address,
	token: string,
): Promise<boolean> {
	const key = relayerLockKey(relayerAddress);
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

async function releaseRelayerLock(
	relayerAddress: Address,
	token: string,
): Promise<void> {
	const key = relayerLockKey(relayerAddress);
	try {
		await getRedis().send("EVAL", [RELEASE_LOCK_SCRIPT, "1", key, token]);
	} catch (err) {
		logger.warn({ err, key }, "relayer lock release failed");
	}
}

async function extendRelayerLock(
	relayerAddress: Address,
	token: string,
): Promise<void> {
	const key = relayerLockKey(relayerAddress);
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
 * Serializes all writes from one relayer wallet to avoid EVM nonce collisions.
 */
export async function withRelayerLock<T>(
	relayerAddress: Address,
	run: () => Promise<T>,
): Promise<T> {
	const token = lockToken();
	const acquired = await acquireRelayerLock(relayerAddress, token);
	if (!acquired) {
		throw new Error("relayer lock unavailable after retries");
	}
	const startedAt = Date.now();
	const heartbeat = setInterval(() => {
		if (Date.now() - startedAt > RELAYER_LOCK_MAX_HOLD_MS) return;
		void extendRelayerLock(relayerAddress, token);
	}, RELAYER_LOCK_HEARTBEAT_MS);
	try {
		return await run();
	} finally {
		clearInterval(heartbeat);
		await releaseRelayerLock(relayerAddress, token);
	}
}
