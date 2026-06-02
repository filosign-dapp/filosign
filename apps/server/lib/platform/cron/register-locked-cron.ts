import type { CronBucketGranularity } from "./cron-bucket";
import { cronBucketForSchedule } from "./cron-bucket";
import { withCronLock } from "./with-cron-lock";

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
