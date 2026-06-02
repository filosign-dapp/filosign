import { getRedis } from "@/lib/platform/cache/session-cache";

export function cronLockKey(jobName: string, bucket: string): string {
	return `fs:lock:cron:${jobName}:${bucket}`;
}

/**
 * Acquire per-tick bucket lock (`SET NX EX`). Returns false when another worker owns the tick.
 */
export async function withCronLock(options: {
	jobName: string;
	bucket: string;
	ttlSec: number;
	run: () => Promise<void>;
}): Promise<boolean> {
	const key = cronLockKey(options.jobName, options.bucket);
	const acquired = await getRedis().send("SET", [
		key,
		"1",
		"NX",
		"EX",
		String(options.ttlSec),
	]);
	if (acquired !== "OK") return false;
	// Lock is not released on success — TTL expires so the same bucket cannot double-run.
	await options.run();
	return true;
}
