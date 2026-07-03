import { and, eq, isNull } from "drizzle-orm";
import { isFocBackupEnabled } from "@/lib/domains/foc/enabled";
import { resolveFocRetentionUntil } from "@/lib/domains/foc/retention-policy";
import {
	assertFocBytesMatch,
	verifyFocCdnCiphertext,
} from "@/lib/domains/foc/utils/cdn-verify";
import db from "@/lib/platform/db";
import {
	dealIdFromUploadResult,
	getOrCreatePlatformDataset,
	getSynapse,
	retentionEpochsFromUntil,
	summarizeSynapseUploadResult,
} from "@/lib/platform/foc";
import { logger } from "@/lib/platform/pino";
import { bucket } from "@/lib/platform/s3/client";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const { files, focObjects } = db.schema;

const uploadsKey = (pieceCid: string) => `uploads/${pieceCid}`;

/** Pending row is eligible for immediate FOC transition. */
export function isFocTransitionDue(row: {
	replicateStatus: string;
	r2EvictedAt: Date | null;
}): boolean {
	return row.replicateStatus === "pending" && row.r2EvictedAt == null;
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
	if (!isFocBackupEnabled()) {
		return;
	}

	const [existing] = await db
		.select({ id: focObjects.id })
		.from(focObjects)
		.where(eq(focObjects.pieceCid, pieceCid))
		.limit(1);

	if (existing) {
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
		lifecycle: "active",
	});
}

/** Idempotent FOC stub + transition enqueue when routing completed (incl. chain backfill). */
export async function tryFocForRoutingCompletePiece(
	pieceCid: string,
): Promise<void> {
	if (!isFocBackupEnabled()) {
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
	} catch (err) {
		logger.warn(
			{ err, pieceCid, organizationId: file.organizationId },
			"foc: stub/transition enqueue failed after routing complete",
		);
	}
}

async function verifyFocCiphertext(args: {
	pieceCid: string;
	expectedBytes: Uint8Array;
}): Promise<"cdn" | "synapse-provider"> {
	const cdnVerified = await tryCatch(
		verifyFocCdnCiphertext({
			pieceCid: args.pieceCid,
			expectedBytes: args.expectedBytes,
		}),
	);
	if (!cdnVerified.error) {
		return "cdn";
	}

	logger.warn(
		{ pieceCid: args.pieceCid, err: cdnVerified.error },
		"foc-transition: CDN verify failed; trying Synapse provider download",
	);

	const downloaded = await tryCatch(
		getSynapse().storage.download({
			pieceCid: args.pieceCid,
			withCDN: false,
		}),
	);
	if (downloaded.error) {
		throw new Error(`FOC verify failed for ${args.pieceCid}`, {
			cause: downloaded.error,
		});
	}

	assertFocBytesMatch({
		pieceCid: args.pieceCid,
		source: "Synapse provider download",
		actualBytes: new Uint8Array(downloaded.data),
		expectedBytes: args.expectedBytes,
	});
	logger.info(
		{ pieceCid: args.pieceCid },
		"foc-transition: Synapse provider verify succeeded after CDN miss",
	);
	return "synapse-provider";
}

export async function runFocTransitionForPiece(
	pieceCid: string,
): Promise<void> {
	if (!isFocBackupEnabled()) {
		return;
	}

	const [row] = await db
		.select()
		.from(focObjects)
		.where(eq(focObjects.pieceCid, pieceCid))
		.limit(1);

	if (!row || !isFocTransitionDue(row)) {
		return;
	}

	const r2Key = row.r2Key;
	if (!(await bucket.exists(r2Key))) {
		throw new Error(`FOC transition: ciphertext missing on R2: ${r2Key}`);
	}

	const r2Bytes = new Uint8Array(await bucket.file(r2Key).arrayBuffer());
	if (r2Bytes.byteLength === 0) {
		throw new Error("FOC transition: ciphertext on R2 is empty");
	}

	const retentionUntil = await resolveFocRetentionUntil(row.organizationId);
	let dealId = row.dealId ?? undefined;

	if (dealId) {
		logger.info(
			{ pieceCid, dealId, organizationId: row.organizationId },
			"foc-transition: resuming verify (upload already committed)",
		);
	} else {
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
			throw new Error("Synapse upload to FOC failed", {
				cause: uploaded.error,
			});
		}

		if (uploaded.data.pieceCid.toString() !== pieceCid) {
			throw new Error(`FOC piece CID mismatch for ${pieceCid}`);
		}

		logger.info(
			{ pieceCid, upload: summarizeSynapseUploadResult(uploaded.data) },
			"foc-transition: Synapse upload result",
		);
		dealId = dealIdFromUploadResult(uploaded.data);
		const checkpointAt = new Date();
		await db
			.update(focObjects)
			.set({
				dealId,
				byteLength: r2Bytes.byteLength,
				retentionUntil,
				updatedAt: checkpointAt,
			})
			.where(eq(focObjects.pieceCid, pieceCid));
	}

	const verifySource = await verifyFocCiphertext({
		pieceCid,
		expectedBytes: r2Bytes,
	});

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
		{ pieceCid, organizationId: row.organizationId, dealId, verifySource },
		"foc-transition: replicated (R2 retained)",
	);
}

export async function listFocTransitionsDue(limit = 50): Promise<string[]> {
	if (!isFocBackupEnabled()) {
		return [];
	}

	const rows = await db
		.select({ pieceCid: focObjects.pieceCid })
		.from(focObjects)
		.where(
			and(
				eq(focObjects.replicateStatus, "pending"),
				isNull(focObjects.r2EvictedAt),
			),
		)
		.limit(limit);

	return rows.map((r) => r.pieceCid);
}
