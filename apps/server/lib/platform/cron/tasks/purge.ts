import { and, eq, inArray, isNull, lt } from "drizzle-orm";
import {
	emitCriticalPlatformEvent,
	PLATFORM_ALERT_EVENTS,
} from "@/lib/platform/analytics";
import db from "@/lib/platform/db";
import { envelopeAttachmentPackets } from "@/lib/platform/db/schema/attachment-packets";
import { files } from "@/lib/platform/db/schema/file";
import { logger } from "@/lib/platform/pino";
import { bucket } from "@/lib/platform/s3/client";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { CRON_LOCK_TTL, type CronHandle, registerLockedCron } from "../utils";

// ==========================================
// 1. Purge Archived Drafts
// ==========================================

export const PURGE_ARCHIVED_DRAFTS_CRON = "0 3 * * *";
export const PURGE_ARCHIVED_DRAFTS_RETENTION_DAYS = 30;
const PURGE_BATCH_SIZE = 200;

function archivedRetentionCutoff(): Date {
	return new Date(
		Date.now() - PURGE_ARCHIVED_DRAFTS_RETENTION_DAYS * 24 * 60 * 60 * 1000,
	);
}

export async function runPurgeArchivedDraftsJob(): Promise<{
	purgedDrafts: number;
	deletedObjects: number;
}> {
	const { envelopeDrafts, envelopeDraftDocuments } = db.schema;
	const cutoff = archivedRetentionCutoff();
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

// ==========================================
// 2. Purge Expired Invites
// ==========================================

export const PURGE_EXPIRED_INVITES_CRON = "30 2 * * *";
export const PURGE_EXPIRED_INVITES_RETENTION_DAYS = 90;

function inviteRetentionCutoff(): Date {
	return new Date(
		Date.now() - PURGE_EXPIRED_INVITES_RETENTION_DAYS * 24 * 60 * 60 * 1000,
	);
}

export async function runPurgeExpiredInvitesJob(): Promise<{
	fileCold: number;
	org: number;
}> {
	const { fileColdInvites, organizationInvites } = db.schema;
	const cutoff = inviteRetentionCutoff();

	const fileCold = await db
		.delete(fileColdInvites)
		.where(
			and(
				eq(fileColdInvites.status, "expired"),
				isNull(fileColdInvites.claimedAt),
				lt(fileColdInvites.updatedAt, cutoff),
			),
		)
		.returning({ id: fileColdInvites.id });

	const org = await db
		.delete(organizationInvites)
		.where(
			and(
				eq(organizationInvites.status, "expired"),
				isNull(organizationInvites.claimedAt),
				lt(organizationInvites.updatedAt, cutoff),
			),
		)
		.returning({ id: organizationInvites.id });

	return { fileCold: fileCold.length, org: org.length };
}

export async function runPurgeExpiredInvitesCronTick(): Promise<void> {
	const res = await tryCatch(runPurgeExpiredInvitesJob());
	if (res.error) {
		logger.error({ err: res.error }, "cron purge-expired-invites failed");
		void emitCriticalPlatformEvent({
			name: PLATFORM_ALERT_EVENTS.serverCronJobFailed,
			severity: "error",
			message: "Cron purge-expired-invites failed",
			context: {
				job: "purge-expired-invites",
				error:
					res.error instanceof Error ? res.error.message : String(res.error),
			},
		});
		return;
	}
	const total = res.data.fileCold + res.data.org;
	if (total > 0)
		logger.info({ ...res.data, total }, "cron purge-expired-invites");
}

export function registerPurgeExpiredInvitesCron(): CronHandle {
	return registerLockedCron({
		jobName: "purge-expired-invites",
		schedule: PURGE_EXPIRED_INVITES_CRON,
		bucketGranularity: "day",
		lockTtlSec: CRON_LOCK_TTL.daily,
		tick: runPurgeExpiredInvitesCronTick,
	});
}

// ==========================================
// 3. Purge Sent Draft Blobs
// ==========================================

export const PURGE_SENT_DRAFT_BLOBS_CRON = "40 3 * * *";
export const SENT_DRAFT_BLOB_RETENTION_DAYS = 90;

function sentDraftRetentionCutoff(): Date {
	return new Date(
		Date.now() - SENT_DRAFT_BLOB_RETENTION_DAYS * 24 * 60 * 60 * 1000,
	);
}

export async function runPurgeSentDraftBlobsJob(): Promise<{
	processedDrafts: number;
	deletedObjects: number;
	removedDocumentRows: number;
}> {
	const { envelopeDrafts, envelopeDraftDocuments } = db.schema;
	const cutoff = sentDraftRetentionCutoff();
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

export async function runPurgeSentDraftBlobsJobTick(): Promise<void> {
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
		tick: runPurgeSentDraftBlobsJobTick,
	});
}

// ==========================================
// 4. Orphan Upload Sweeper
// ==========================================

export const ORPHAN_UPLOAD_SWEEPER_CRON = "0 4 * * *";
export const ORPHAN_UPLOAD_MIN_AGE_MS = 24 * 60 * 60 * 1000;
const LIST_BATCH_SIZE = 500;

type S3ListedObject = {
	key: string;
	lastModified?: Date | string;
};

type S3ListPage = {
	contents?: S3ListedObject[];
	isTruncated?: boolean;
	nextContinuationToken?: string;
};

function parseLastModified(value: Date | string | undefined): number | null {
	if (!value) return null;
	const ms = value instanceof Date ? value.getTime() : Date.parse(value);
	return Number.isFinite(ms) ? ms : null;
}

async function listUploadKeysPage(args: {
	continuationToken?: string;
}): Promise<S3ListPage> {
	return bucket.list({
		prefix: "uploads/",
		maxKeys: LIST_BATCH_SIZE,
		...(args.continuationToken
			? { continuationToken: args.continuationToken }
			: {}),
	}) as Promise<S3ListPage>;
}

function pieceCidFromUploadKey(key: string): string | null {
	const prefix = "uploads/";
	if (!key.startsWith(prefix)) return null;
	const rest = key.slice(prefix.length);
	if (!rest || rest.includes("/")) return null;
	return rest;
}

function packetCidFromAttachmentKey(key: string): string | null {
	const prefix = "uploads/attachments/";
	if (!key.startsWith(prefix)) return null;
	const rest = key.slice(prefix.length);
	if (!rest || rest.includes("/")) return null;
	return rest;
}

async function filterOrphanPieceCids(
	candidates: { key: string; lastModifiedMs: number }[],
): Promise<{ key: string; lastModifiedMs: number }[]> {
	const pieceCids = candidates
		.map((c) => pieceCidFromUploadKey(c.key))
		.filter((id): id is string => id !== null);
	if (pieceCids.length === 0) return [];

	const registered = await db
		.select({ pieceCid: files.pieceCid })
		.from(files)
		.where(inArray(files.pieceCid, pieceCids));
	const registeredSet = new Set(registered.map((r) => r.pieceCid));

	return candidates.filter((c) => {
		const id = pieceCidFromUploadKey(c.key);
		return id !== null && !registeredSet.has(id);
	});
}

async function filterOrphanAttachmentKeys(
	candidates: { key: string; lastModifiedMs: number }[],
): Promise<{ key: string; lastModifiedMs: number }[]> {
	const packetCids = candidates
		.map((c) => packetCidFromAttachmentKey(c.key))
		.filter((id): id is string => id !== null);
	if (packetCids.length === 0) return [];

	const registered = await db
		.select({ packetCid: envelopeAttachmentPackets.packetCid })
		.from(envelopeAttachmentPackets)
		.where(inArray(envelopeAttachmentPackets.packetCid, packetCids));
	const registeredSet = new Set(registered.map((r) => r.packetCid));

	return candidates.filter((c) => {
		const id = packetCidFromAttachmentKey(c.key);
		return id !== null && !registeredSet.has(id);
	});
}

export async function runOrphanUploadSweeperJob(): Promise<{
	deleted: number;
	scanned: number;
}> {
	const cutoffMs = Date.now() - ORPHAN_UPLOAD_MIN_AGE_MS;
	let continuationToken: string | undefined;
	let deleted = 0;
	let scanned = 0;

	do {
		const page = await listUploadKeysPage({ continuationToken });
		const contents = page.contents ?? [];
		continuationToken = page.isTruncated
			? page.nextContinuationToken
			: undefined;

		const envelopeCandidates: { key: string; lastModifiedMs: number }[] = [];
		const attachmentCandidates: { key: string; lastModifiedMs: number }[] = [];

		for (const obj of contents) {
			if (!obj.key || obj.key.endsWith("/")) continue;
			scanned += 1;
			const lastModifiedMs = parseLastModified(obj.lastModified);
			if (lastModifiedMs === null || lastModifiedMs > cutoffMs) continue;

			if (obj.key.startsWith("uploads/attachments/")) {
				attachmentCandidates.push({ key: obj.key, lastModifiedMs });
			} else if (pieceCidFromUploadKey(obj.key)) {
				envelopeCandidates.push({ key: obj.key, lastModifiedMs });
			}
		}

		const toDelete = [
			...(await filterOrphanPieceCids(envelopeCandidates)),
			...(await filterOrphanAttachmentKeys(attachmentCandidates)),
		];

		for (const { key } of toDelete) {
			await bucket.delete(key);
			deleted += 1;
		}
	} while (continuationToken);

	if (deleted > 0) {
		logger.info({ deleted, scanned }, "orphan upload sweeper deleted objects");
	}
	return { deleted, scanned };
}

export function registerOrphanUploadSweeperCron(): CronHandle {
	return registerLockedCron({
		jobName: "orphan-upload-sweeper",
		schedule: ORPHAN_UPLOAD_SWEEPER_CRON,
		bucketGranularity: "day",
		lockTtlSec: CRON_LOCK_TTL.daily,
		tick: async () => {
			await runOrphanUploadSweeperJob();
		},
	});
}
