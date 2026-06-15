import { getRedis } from "@/lib/platform/cache/session";

const LOCK_TTL_SEC = 120;
const MAX_ACQUIRE_ATTEMPTS = 60;
const ACQUIRE_DELAY_MS = 50;

function registerPieceLockKey(pieceCid: string): string {
	return `fs:lock:register:${pieceCid}`;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Serializes register relay + persist for one pieceCid (parallel double-submit guard).
 */
export async function withRegisterPieceLock<T>(
	pieceCid: string,
	run: () => Promise<T>,
): Promise<T> {
	const key = registerPieceLockKey(pieceCid);
	const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
	for (let attempt = 0; attempt < MAX_ACQUIRE_ATTEMPTS; attempt += 1) {
		const acquired = await getRedis().send("SET", [
			key,
			token,
			"NX",
			"EX",
			String(LOCK_TTL_SEC),
		]);
		if (acquired === "OK") {
			try {
				return await run();
			} finally {
				const script = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end`;
				try {
					await getRedis().send("EVAL", [script, "1", key, token]);
				} catch {
					// lock expires via TTL
				}
			}
		}
		await sleep(ACQUIRE_DELAY_MS + Math.min(attempt, 20) * 10);
	}
	throw new Error(`register piece lock unavailable for ${pieceCid}`);
}
