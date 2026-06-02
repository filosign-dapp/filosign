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

export const PURGE_SENT_DRAFT_BLOBS_CRON = "40 3 * * *";
export const SENT_DRAFT_BLOB_RETENTION_DAYS = 90;
const PURGE_BATCH_SIZE = 200;

const { envelopeDrafts, envelopeDraftDocuments } = db.schema;

function retentionCutoff(): Date {
	return new Date(
		Date.now() - SENT_DRAFT_BLOB_RETENTION_DAYS * 24 * 60 * 60 * 1000,
	);
}

export async function runPurgeSentDraftBlobsJob(): Promise<{
	processedDrafts: number;
	deletedObjects: number;
	removedDocumentRows: number;
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
				eq(envelopeDrafts.status, "sent"),
				lt(envelopeDrafts.updatedAt, cutoff),
			),
		)
		.limit(PURGE_BATCH_SIZE);

	if (candidates.length === 0) {
		return { processedDrafts: 0, deletedObjects: 0, removedDocumentRows: 0 };
	}

	const draftIds = candidates.map((row) => row.id);
	const docRows = await db
		.select({
			id: envelopeDraftDocuments.id,
			s3Key: envelopeDraftDocuments.s3Key,
		})
		.from(envelopeDraftDocuments)
		.where(inArray(envelopeDraftDocuments.draftId, draftIds));

	const objectKeys = new Set<string>();
	for (const row of candidates) {
		if (row.headSnapshotS3Key) objectKeys.add(row.headSnapshotS3Key);
	}
	for (const row of docRows) {
		objectKeys.add(row.s3Key);
	}

	let deletedObjects = 0;
	for (const key of objectKeys) {
		const deleted = await tryCatch(bucket.delete(key));
		if (!deleted.error) deletedObjects += 1;
	}

	const removedDocumentRows = (
		await db
			.delete(envelopeDraftDocuments)
			.where(inArray(envelopeDraftDocuments.draftId, draftIds))
			.returning({ id: envelopeDraftDocuments.id })
	).length;

	await db
		.update(envelopeDrafts)
		.set({
			headSnapshotS3Key: null,
			headDekWrappedOmk: null,
			headOmkKemCiphertext: null,
			updatedAt: new Date(),
		})
		.where(inArray(envelopeDrafts.id, draftIds));

	return {
		processedDrafts: draftIds.length,
		deletedObjects,
		removedDocumentRows,
	};
}

export async function runPurgeSentDraftBlobsCronTick(): Promise<void> {
	const res = await tryCatch(runPurgeSentDraftBlobsJob());
	if (res.error) {
		logger.error({ err: res.error }, "cron purge-sent-draft-blobs failed");
		void emitCriticalPlatformEvent({
			name: PLATFORM_ALERT_EVENTS.serverCronJobFailed,
			severity: "error",
			message: "Cron purge-sent-draft-blobs failed",
			context: {
				job: "purge-sent-draft-blobs",
				error:
					res.error instanceof Error ? res.error.message : String(res.error),
			},
		});
		return;
	}
	if (
		res.data.processedDrafts > 0 ||
		res.data.deletedObjects > 0 ||
		res.data.removedDocumentRows > 0
	) {
		logger.info(res.data, "cron purge-sent-draft-blobs");
	}
}

export function registerPurgeSentDraftBlobsCron(): CronHandle {
	return registerLockedCron({
		jobName: "purge-sent-draft-blobs",
		schedule: PURGE_SENT_DRAFT_BLOBS_CRON,
		bucketGranularity: "day",
		lockTtlSec: CRON_LOCK_TTL.daily,
		tick: runPurgeSentDraftBlobsCronTick,
	});
}
