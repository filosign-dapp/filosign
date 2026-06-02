import { and, eq, inArray, lt } from "drizzle-orm";
import { PLATFORM_ALERT_EVENTS } from "@/lib/platform/analytics/events";
import { emitCriticalPlatformEvent } from "@/lib/platform/analytics/platform-alerts";
import db from "@/lib/platform/db";
import { logger } from "@/lib/platform/pino";
import { bucket } from "@/lib/platform/s3/client";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import {
	CRON_LOCK_TTL,
	type CronHandle,
	registerLockedCron,
} from "./register-locked-cron";

/** Daily at 03:00 UTC — hard-delete archived drafts older than 30 days. */
export const PURGE_ARCHIVED_DRAFTS_CRON = "0 3 * * *";
export const PURGE_ARCHIVED_DRAFTS_RETENTION_DAYS = 30;
const PURGE_BATCH_SIZE = 200;

const { envelopeDrafts, envelopeDraftDocuments } = db.schema;

function retentionCutoff(): Date {
	return new Date(
		Date.now() - PURGE_ARCHIVED_DRAFTS_RETENTION_DAYS * 24 * 60 * 60 * 1000,
	);
}

export async function runPurgeArchivedDraftsJob(): Promise<{
	purgedDrafts: number;
	deletedObjects: number;
}> {
	const cutoff = retentionCutoff();
	const candidates = await db
		.select({
			id: envelopeDrafts.id,
			headSnapshotS3Key: envelopeDrafts.headSnapshotS3Key,
		})
		.from(envelopeDrafts)
		.where(
			and(
				eq(envelopeDrafts.status, "archived"),
				lt(envelopeDrafts.updatedAt, cutoff),
			),
		)
		.limit(PURGE_BATCH_SIZE);

	if (candidates.length === 0) {
		return { purgedDrafts: 0, deletedObjects: 0 };
	}

	const draftIds = candidates.map((row) => row.id);
	// Pull document keys for all candidate drafts.
	const docRows = await db
		.select({
			draftId: envelopeDraftDocuments.draftId,
			s3Key: envelopeDraftDocuments.s3Key,
		})
		.from(envelopeDraftDocuments)
		.where(inArray(envelopeDraftDocuments.draftId, draftIds));

	const objectKeys = new Set<string>();
	for (const row of candidates) {
		if (row.headSnapshotS3Key) objectKeys.add(row.headSnapshotS3Key);
	}
	for (const row of docRows) {
		if (row.s3Key) objectKeys.add(row.s3Key);
	}

	let deletedObjects = 0;
	for (const key of objectKeys) {
		const deleted = await tryCatch(bucket.delete(key));
		if (!deleted.error) deletedObjects += 1;
	}

	const deletedDrafts = await db
		.delete(envelopeDrafts)
		.where(
			and(
				eq(envelopeDrafts.status, "archived"),
				lt(envelopeDrafts.updatedAt, cutoff),
				inArray(envelopeDrafts.id, draftIds),
			),
		)
		.returning({ id: envelopeDrafts.id });

	return { purgedDrafts: deletedDrafts.length, deletedObjects };
}

export async function runPurgeArchivedDraftsCronTick(): Promise<void> {
	const res = await tryCatch(runPurgeArchivedDraftsJob());
	if (res.error) {
		logger.error({ err: res.error }, "cron purge-archived-drafts failed");
		void emitCriticalPlatformEvent({
			name: PLATFORM_ALERT_EVENTS.serverCronJobFailed,
			severity: "error",
			message: "Cron purge-archived-drafts failed",
			context: {
				job: "purge-archived-drafts",
				error:
					res.error instanceof Error ? res.error.message : String(res.error),
			},
		});
		return;
	}
	if (res.data.purgedDrafts > 0 || res.data.deletedObjects > 0) {
		logger.info(res.data, "cron purge-archived-drafts");
	}
}

export function registerPurgeArchivedDraftsCron(): CronHandle {
	return registerLockedCron({
		jobName: "purge-archived-drafts",
		schedule: PURGE_ARCHIVED_DRAFTS_CRON,
		bucketGranularity: "day",
		lockTtlSec: CRON_LOCK_TTL.daily,
		tick: runPurgeArchivedDraftsCronTick,
	});
}
