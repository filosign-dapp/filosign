import { getRedis } from "@/lib/platform/cache/session";

export type CronBucketGranularity = "hour" | "day";

/** UTC hour bucket: `yyyy-mm-dd-HH` */
export function formatHourBucket(date: Date): string {
	const y = date.getUTCFullYear();
	const m = String(date.getUTCMonth() + 1).padStart(2, "0");
	const d = String(date.getUTCDate()).padStart(2, "0");
	const h = String(date.getUTCHours()).padStart(2, "0");
	return `${y}-${m}-${d}-${h}`;
}

/** UTC day bucket: `yyyy-mm-dd` */
export function formatDayBucket(date: Date): string {
	const y = date.getUTCFullYear();
	const m = String(date.getUTCMonth() + 1).padStart(2, "0");
	const d = String(date.getUTCDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

export function formatCronBucket(
	date: Date,
	granularity: CronBucketGranularity,
): string {
	return granularity === "hour"
		? formatHourBucket(date)
		: formatDayBucket(date);
}

/**
 * Last scheduled fire at or before `nowMs` for a cron expression (UTC).
 * Uses `Bun.cron.parse` — not wall-clock at job end (avoids double-run on drift).
 */
const CRON_LOOKBACK_MS = 8 * 24 * 60 * 60 * 1000;

export function resolveScheduledFireMs(
	schedule: string,
	nowMs = Date.now(),
): number {
	const anchor = new Date(nowMs - CRON_LOOKBACK_MS);
	const candidate = Bun.cron.parse(schedule, anchor);
	if (!candidate) return nowMs;

	let prev = candidate.getTime();
	let next = Bun.cron.parse(schedule, new Date(prev + 1));
	while (next && next.getTime() <= nowMs) {
		prev = next.getTime();
		next = Bun.cron.parse(schedule, new Date(prev + 1));
	}
	return prev;
}

export function cronBucketForSchedule(
	schedule: string,
	granularity: CronBucketGranularity,
	nowMs = Date.now(),
): string {
	const scheduledMs = resolveScheduledFireMs(schedule, nowMs);
	return formatCronBucket(new Date(scheduledMs), granularity);
}

export type CronHandle = { stop(): void };

/** TTL ≥ expected job duration + buffer (hourly / daily). */
export const CRON_LOCK_TTL = {
	hourly: 65 * 60,
	daily: 25 * 60 * 60,
} as const;

export type RegisterLockedCronOptions = {
	jobName: string;
	schedule: string;
	bucketGranularity: CronBucketGranularity;
	lockTtlSec: number;
	tick: () => Promise<void>;
};

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

export function registerLockedCron(
	options: RegisterLockedCronOptions,
): CronHandle {
	return Bun.cron(options.schedule, async () => {
		const bucket = cronBucketForSchedule(
			options.schedule,
			options.bucketGranularity,
		);
		await withCronLock({
			jobName: options.jobName,
			bucket,
			ttlSec: options.lockTtlSec,
			run: options.tick,
		});
	}) as CronHandle;
}
