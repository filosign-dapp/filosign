import { createHash, randomBytes } from "node:crypto";
import { getAddress } from "viem";
import env from "@/env";
import { getRedis } from "@/lib/platform/cache/session-cache";
import { logger } from "@/lib/platform/pino";

/** Must exceed slow-block buffer; extended under congestion in Sprint 6 if needed. */
export const RELAYER_LOCK_TTL_SEC = 300;

const MAX_ACQUIRE_ATTEMPTS = 120;
const ACQUIRE_BASE_DELAY_MS = 50;

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
		const current = await getRedis().get(key);
		if (current === token) {
			await getRedis().del(key);
		}
	} catch (err) {
		logger.warn({ err, key }, "relayer lock release failed");
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
	try {
		return await run();
	} finally {
		await releaseRelayerLock(token);
	}
}
