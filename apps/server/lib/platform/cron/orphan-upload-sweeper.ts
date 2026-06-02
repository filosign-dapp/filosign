import { inArray } from "drizzle-orm";
import db from "@/lib/platform/db";
import { envelopeAttachmentPackets } from "@/lib/platform/db/schema/attachment-packets";
import { files } from "@/lib/platform/db/schema/file";
import { logger } from "@/lib/platform/pino";
import { bucket } from "@/lib/platform/s3/client";
import {
	CRON_LOCK_TTL,
	type CronHandle,
	registerLockedCron,
} from "./register-locked-cron";

/** Daily — remove presigned upload blobs with no registered file / attachment row. */
export const ORPHAN_UPLOAD_SWEEPER_CRON = "0 4 * * *";

/** Only delete objects older than this (user may still be uploading / registering). */
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
