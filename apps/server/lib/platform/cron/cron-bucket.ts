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
/** Lookback for finding the last cron fire (covers daily jobs). */
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
