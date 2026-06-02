import { pruneProcessedOutboxOlderThan } from "@/lib/platform/jobs";
import { logger } from "@/lib/platform/pino";
import {
	CRON_LOCK_TTL,
	type CronHandle,
	registerLockedCron,
} from "./register-locked-cron";

/** Daily at 04:15 UTC — delete processed outbox rows older than retention. */
export const OUTBOX_PRUNE_CRON = "15 4 * * *";

export const OUTBOX_PROCESSED_RETENTION_DAYS = 7;

export async function runOutboxPruneJob(): Promise<number> {
	const cutoff = new Date(
		Date.now() - OUTBOX_PROCESSED_RETENTION_DAYS * 24 * 60 * 60 * 1000,
	);
	const deleted = await pruneProcessedOutboxOlderThan(cutoff);
	if (deleted > 0) {
		logger.info({ deleted, cutoff }, "pruned processed job_outbox rows");
	}
	return deleted;
}

export function registerOutboxPruneCron(): CronHandle {
	return registerLockedCron({
		jobName: "outbox-prune",
		schedule: OUTBOX_PRUNE_CRON,
		bucketGranularity: "day",
		lockTtlSec: CRON_LOCK_TTL.daily,
		tick: async () => {
			await runOutboxPruneJob();
		},
	});
}
