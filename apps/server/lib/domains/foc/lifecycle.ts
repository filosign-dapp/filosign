import { and, eq, exists, isNull, lte, or } from "drizzle-orm";
import env from "@/env";
import { resolveFocRetentionUntil } from "@/lib/domains/foc/retention-policy";
import db from "@/lib/platform/db";
import {
	archivalCdnUrl,
	dealIdFromUploadResult,
	getOrCreatePlatformDataset,
	retentionEpochsFromUntil,
	synapse,
} from "@/lib/platform/foc";
import { logger } from "@/lib/platform/pino";
import { bucket } from "@/lib/platform/s3/client";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const { complianceExportLogs, files, focObjects } = db.schema;

const uploadsKey = (pieceCid: string) => `uploads/${pieceCid}`;

/** Defer FOC replication while hot window is active and sender has not exported. */
export function shouldDeferFocTransition(args: {
	inHotWindow: boolean;
	senderExported: boolean;
}): boolean {
	return args.inHotWindow && !args.senderExported;
}

/** Pending row is eligible for cron discovery (hot window ended or sender exported). */
export function isFocTransitionDiscoverable(args: {
	inHotWindow: boolean;
	senderExported: boolean;
}): boolean {
	return !args.inHotWindow || args.senderExported;
}

function addDays(from: Date, days: number): Date {
	const d = new Date(from);
	d.setUTCDate(d.getUTCDate() + days);
	return d;
}

export async function createFocStubForCompletedEnvelope(
	pieceCid: string,
	organizationId: string,
): Promise<void> {
	const [existing] = await db
		.select({ id: focObjects.id })
		.from(focObjects)
		.where(eq(focObjects.pieceCid, pieceCid))
		.limit(1);

	if (existing) return;

	const r2Key = uploadsKey(pieceCid);
	let byteLength = 0;
	if (await bucket.exists(r2Key)) {
		byteLength = bucket.file(r2Key).size;
	} else {
		logger.warn(
			{ pieceCid, r2Key, organizationId },
			"foc-stub: missing R2 blob",
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
		r2EvictAfter: addDays(completedAt, env.R2_HOT_DAYS),
		lifecycle: "active",
	});
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
	const now = new Date();
	const [row] = await db
		.select()
		.from(focObjects)
		.where(eq(focObjects.pieceCid, pieceCid))
		.limit(1);

	if (!row || row.replicateStatus === "replicated" || row.r2EvictedAt) {
		return;
	}

	const inHotWindow = row.r2EvictAfter > now;
	const senderExported = await senderHasComplianceExport(pieceCid);
	if (shouldDeferFocTransition({ inHotWindow, senderExported })) {
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

	const retentionUntil = await resolveFocRetentionUntil(row.organizationId);
	const context = await getOrCreatePlatformDataset();
	const prepared = await tryCatch(
		synapse.storage.prepare({
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

	const deleted = await tryCatch(bucket.delete(r2Key));
	if (deleted.error) {
		throw new Error(`FOC transition: R2 delete failed for ${r2Key}`, {
			cause: deleted.error,
		});
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
			r2EvictedAt: verifiedAt,
			updatedAt: verifiedAt,
		})
		.where(eq(focObjects.pieceCid, pieceCid));

	logger.info(
		{ pieceCid, organizationId: row.organizationId, dealId },
		"foc-transition: replicated and evicted R2",
	);
}

export async function listFocTransitionsDue(limit = 50): Promise<string[]> {
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
