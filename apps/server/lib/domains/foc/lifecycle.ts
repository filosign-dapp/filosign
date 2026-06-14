import { and, eq, exists, isNull, lte, or } from "drizzle-orm";
import env from "@/env";
import { resolveFocRetentionUntil } from "@/lib/domains/foc/retention-policy";
import db from "@/lib/platform/db";
import {
	archivalCdnUrl,
	dealIdFromUploadResult,
	getOrCreatePlatformDataset,
	getSynapse,
	retentionEpochsFromUntil,
} from "@/lib/platform/foc";
import { logger } from "@/lib/platform/pino";
import { bucket } from "@/lib/platform/s3/client";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { isFocEnabled } from "./enabled";
import { logFocSmoke } from "./smoke-log";

const { complianceExportLogs, files, focObjects } = db.schema;

const uploadsKey = (pieceCid: string) => `uploads/${pieceCid}`;

/** Defer FOC replication while hot window is active and sender has not exported. */
export function shouldDeferFocTransition(args: {
	inHotWindow: boolean;
	senderExported: boolean;
}): boolean {
	return args.inHotWindow && !args.senderExported;
}

/** Job runner deferral - bypassed when `TEST_FOC` smoke flag is enabled. */
export function shouldDeferFocTransitionForJob(args: {
	inHotWindow: boolean;
	senderExported: boolean;
	testFocEnabled: boolean;
}): boolean {
	if (args.testFocEnabled) return false;
	return shouldDeferFocTransition(args);
}

/** Pending row is eligible for cron discovery (hot window ended or sender exported). */
export function isFocTransitionDiscoverable(args: {
	inHotWindow: boolean;
	senderExported: boolean;
}): boolean {
	return !args.inHotWindow || args.senderExported;
}

/** Bun S3 `file().size` is unset until read; prefer DB, then R2 bytes. */
async function resolveCiphertextByteLength(
	pieceCid: string,
	r2Key: string,
): Promise<number> {
	const [fileRow] = await db
		.select({ ciphertextByteLength: files.ciphertextByteLength })
		.from(files)
		.where(eq(files.pieceCid, pieceCid))
		.limit(1);

	const fromDb = fileRow?.ciphertextByteLength;
	if (fromDb != null && Number.isFinite(fromDb) && fromDb > 0) {
		return fromDb;
	}

	if (!(await bucket.exists(r2Key))) {
		return 0;
	}

	const bytes = await bucket.file(r2Key).arrayBuffer();
	const len = bytes.byteLength;
	return Number.isFinite(len) && len >= 0 ? len : 0;
}

export async function createFocStubForCompletedEnvelope(
	pieceCid: string,
	organizationId: string,
): Promise<void> {
	if (!isFocEnabled()) {
		return;
	}

	const [existing] = await db
		.select({ id: focObjects.id })
		.from(focObjects)
		.where(eq(focObjects.pieceCid, pieceCid))
		.limit(1);

	if (existing) {
		logFocSmoke("stub already exists; skipping insert", {
			pieceCid,
			organizationId,
		});
		return;
	}

	const r2Key = uploadsKey(pieceCid);
	const byteLength = await resolveCiphertextByteLength(pieceCid, r2Key);
	if (byteLength === 0) {
		logger.warn(
			{ pieceCid, r2Key, organizationId },
			"foc-stub: missing R2 blob or zero-length ciphertext",
		);
	}

	const completedAt = new Date();
	await db.insert(focObjects).values({
		organizationId,
		pieceCid,
		r2Key,
		byteLength,
		replicateStatus: "pending",
		retentionUntil: await resolveFocRetentionUntil(organizationId),
		completedAt,
		r2EvictAfter: completedAt,
		lifecycle: "active",
	});

	logFocSmoke("stub created (replicate_status=pending)", {
		pieceCid,
		organizationId,
		r2Key,
		byteLength,
		r2EvictAfter: completedAt.toISOString(),
	});
}

/** Idempotent FOC stub + transition enqueue when routing completed (incl. chain backfill). */
export async function tryFocForRoutingCompletePiece(
	pieceCid: string,
): Promise<void> {
	if (!isFocEnabled()) {
		return;
	}

	const [file] = await db
		.select({ organizationId: files.organizationId })
		.from(files)
		.where(eq(files.pieceCid, pieceCid))
		.limit(1);

	if (!file?.organizationId) {
		return;
	}

	try {
		await createFocStubForCompletedEnvelope(pieceCid, file.organizationId);
		const { enqueueFocTransition } = await import("@/lib/platform/jobs");
		await enqueueFocTransition(pieceCid);
		logFocSmoke("enqueued foc-transition job", { pieceCid });
	} catch (err) {
		logger.warn(
			{ err, pieceCid, organizationId: file.organizationId },
			"foc: stub/transition enqueue failed after routing complete",
		);
	}
}

async function senderHasComplianceExport(pieceCid: string): Promise<boolean> {
	const [row] = await db
		.select({ id: complianceExportLogs.id })
		.from(complianceExportLogs)
		.innerJoin(files, eq(files.pieceCid, complianceExportLogs.filePieceCid))
		.where(
			and(
				eq(complianceExportLogs.filePieceCid, pieceCid),
				eq(complianceExportLogs.requestedBy, files.sender),
			),
		)
		.limit(1);
	return Boolean(row);
}

export async function runFocTransitionForPiece(
	pieceCid: string,
): Promise<void> {
	if (!isFocEnabled()) {
		logFocSmoke("transition skipped (FOC disabled)", { pieceCid });
		return;
	}

	const now = new Date();
	const [row] = await db
		.select()
		.from(focObjects)
		.where(eq(focObjects.pieceCid, pieceCid))
		.limit(1);

	if (!row) {
		logFocSmoke("transition skipped (no foc_objects row)", { pieceCid });
		return;
	}
	if (row.replicateStatus === "replicated") {
		logFocSmoke("transition skipped (already replicated)", {
			pieceCid,
			dealId: row.dealId,
		});
		return;
	}
	if (row.r2EvictedAt) {
		logFocSmoke("transition skipped (r2 evicted)", { pieceCid });
		return;
	}

	logFocSmoke("transition starting", {
		pieceCid,
		organizationId: row.organizationId,
		byteLength: row.byteLength,
		testFoc: env.TEST_FOC,
	});

	const inHotWindow = row.r2EvictAfter > now;
	const senderExported = await senderHasComplianceExport(pieceCid);
	if (
		shouldDeferFocTransitionForJob({
			inHotWindow,
			senderExported,
			testFocEnabled: env.TEST_FOC,
		})
	) {
		logger.info(
			{ pieceCid, organizationId: row.organizationId },
			"foc-transition: deferred until sender exports compliance packet",
		);
		return;
	}
	if (!senderExported && !inHotWindow) {
		logger.warn(
			{ pieceCid, organizationId: row.organizationId },
			"foc-transition: proceeding without sender export after r2EvictAfter",
		);
	}

	const r2Key = row.r2Key;
	if (!(await bucket.exists(r2Key))) {
		throw new Error(`FOC transition: ciphertext missing on R2: ${r2Key}`);
	}

	const r2Bytes = new Uint8Array(await bucket.file(r2Key).arrayBuffer());
	if (r2Bytes.byteLength === 0) {
		throw new Error("FOC transition: ciphertext on R2 is empty");
	}

	logFocSmoke("R2 ciphertext loaded; preparing Synapse upload", {
		pieceCid,
		byteLength: r2Bytes.byteLength,
		r2Key,
	});

	const retentionUntil = await resolveFocRetentionUntil(row.organizationId);
	const context = await getOrCreatePlatformDataset();
	const prepared = await tryCatch(
		getSynapse().storage.prepare({
			context,
			dataSize: BigInt(r2Bytes.byteLength),
			extraRunwayEpochs: retentionEpochsFromUntil(retentionUntil),
		}),
	);
	if (prepared.error) {
		throw new Error("Synapse prepare failed before FOC transition", {
			cause: prepared.error,
		});
	}

	if (prepared.data.transaction) {
		const executed = await tryCatch(prepared.data.transaction.execute());
		if (executed.error) {
			throw new Error("Synapse funding transaction failed", {
				cause: executed.error,
			});
		}
	}

	const uploaded = await tryCatch(
		context.upload(r2Bytes, { pieceMetadata: {} }),
	);
	if (uploaded.error) {
		throw new Error("Synapse upload to FOC failed", { cause: uploaded.error });
	}

	if (uploaded.data.pieceCid.toString() !== pieceCid) {
		throw new Error(`FOC piece CID mismatch for ${pieceCid}`);
	}

	const dealId = dealIdFromUploadResult(uploaded.data);
	logFocSmoke("Synapse upload ok; verifying FOC CDN bytes", {
		pieceCid,
		dealId,
		cdnUrl: archivalCdnUrl(pieceCid),
	});
	const focRes = await tryCatch(fetch(archivalCdnUrl(pieceCid)));
	if (focRes.error || !focRes.data.ok) {
		throw new Error(`FOC CDN verify failed for ${pieceCid}`, {
			cause: focRes.error,
		});
	}
	const focBytes = new Uint8Array(await focRes.data.arrayBuffer());
	if (
		focBytes.byteLength !== r2Bytes.byteLength ||
		!focBytes.every((b, i) => b === r2Bytes[i])
	) {
		throw new Error(`FOC bytes mismatch for ${pieceCid}`);
	}

	const verifiedAt = new Date();
	await db
		.update(focObjects)
		.set({
			replicateStatus: "replicated",
			dealId,
			byteLength: r2Bytes.byteLength,
			retentionUntil,
			focVerifiedAt: verifiedAt,
			updatedAt: verifiedAt,
		})
		.where(eq(focObjects.pieceCid, pieceCid));

	logger.info(
		{ pieceCid, organizationId: row.organizationId, dealId },
		"foc-transition: replicated (R2 retained)",
	);
}

export async function listFocTransitionsDue(limit = 50): Promise<string[]> {
	if (!isFocEnabled()) {
		return [];
	}

	const now = new Date();
	const senderExportExists = db
		.select({ id: complianceExportLogs.id })
		.from(complianceExportLogs)
		.innerJoin(files, eq(files.pieceCid, complianceExportLogs.filePieceCid))
		.where(
			and(
				eq(complianceExportLogs.filePieceCid, focObjects.pieceCid),
				eq(complianceExportLogs.requestedBy, files.sender),
			),
		);

	const rows = await db
		.select({ pieceCid: focObjects.pieceCid })
		.from(focObjects)
		.where(
			and(
				eq(focObjects.replicateStatus, "pending"),
				isNull(focObjects.r2EvictedAt),
				or(lte(focObjects.r2EvictAfter, now), exists(senderExportExists)),
			),
		)
		.limit(limit);

	return rows.map((r) => r.pieceCid);
}
