import { emitEmailOutboxStuckAlert } from "@/lib/platform/analytics";
import {
	enqueueClaimedOutboxRows,
	isEmailJobActive,
	listStaleUnprocessedOutbox,
	pruneProcessedOutboxOlderThan,
	summarizeStaleUnprocessedOutbox,
} from "@/lib/platform/jobs";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { CRON_LOCK_TTL, type CronHandle, registerLockedCron } from "../utils";

// ==========================================
// 1. Outbox Sweeper
// ==========================================

export const OUTBOX_SWEEPER_CRON = "*/5 * * * *";
export const OUTBOX_SWEEPER_MIN_AGE_MS = 5 * 60 * 1000;
export const OUTBOX_STUCK_ALERT_MIN_AGE_MS = 30 * 60 * 1000;
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

	let enqueued = 0;
	if (toEnqueue.length > 0) {
		enqueued = await enqueueClaimedOutboxRows(toEnqueue);
		logger.info(
			{ stale: stale.length, enqueued },
			"outbox sweeper re-enqueued stale rows",
		);
	}

	const stuckSummary = await summarizeStaleUnprocessedOutbox({
		olderThan: new Date(Date.now() - OUTBOX_STUCK_ALERT_MIN_AGE_MS),
	});
	if (stuckSummary) {
		await emitEmailOutboxStuckAlert(stuckSummary);
	}

	return enqueued;
}

export function registerOutboxSweeperCron(): CronHandle {
	return registerLockedCron({
		jobName: "outbox-sweeper",
		schedule: OUTBOX_SWEEPER_CRON,
		bucketGranularity: "hour",
		lockTtlSec: CRON_LOCK_TTL.hourly,
		tick: async () => {
			const res = await tryCatch(runOutboxSweeperJob());
			if (res.error) {
				logger.error({ err: res.error }, "cron outbox-sweeper failed");
			}
		},
	});
}

// ==========================================
// 2. Outbox Prune
// ==========================================

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
