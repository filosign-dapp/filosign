import {
	enqueueClaimedOutboxRows,
	isEmailJobActive,
	listStaleUnprocessedOutbox,
} from "@/lib/platform/jobs";
import { logger } from "@/lib/platform/pino";
import {
	CRON_LOCK_TTL,
	type CronHandle,
	registerLockedCron,
} from "./register-locked-cron";

/** Every 5 minutes — re-enqueue outbox rows missed by fast-path or drainer. */
export const OUTBOX_SWEEPER_CRON = "*/5 * * * *";

/** Only rows older than this are eligible (avoids racing fast-path enqueue). */
export const OUTBOX_SWEEPER_MIN_AGE_MS = 5 * 60 * 1000;

const SWEEP_BATCH_SIZE = 100;

export async function runOutboxSweeperJob(): Promise<number> {
	const olderThan = new Date(Date.now() - OUTBOX_SWEEPER_MIN_AGE_MS);
	const stale = await listStaleUnprocessedOutbox({
		olderThan,
		limit: SWEEP_BATCH_SIZE,
	});

	const toEnqueue = [];
	for (const row of stale) {
		const active = await isEmailJobActive(row.idempotencyKey);
		if (!active) toEnqueue.push(row);
	}

	if (toEnqueue.length === 0) return 0;

	const enqueued = await enqueueClaimedOutboxRows(toEnqueue);
	logger.info(
		{ stale: stale.length, enqueued },
		"outbox sweeper re-enqueued stale rows",
	);
	return enqueued;
}

export function registerOutboxSweeperCron(): CronHandle {
	return registerLockedCron({
		jobName: "outbox-sweeper",
		schedule: OUTBOX_SWEEPER_CRON,
		bucketGranularity: "hour",
		lockTtlSec: CRON_LOCK_TTL.hourly,
		tick: async () => {
			await runOutboxSweeperJob();
		},
	});
}
