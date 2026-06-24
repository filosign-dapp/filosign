import type { InferInsertModel } from "drizzle-orm";
import { and, asc, eq, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { type Address, getAddress } from "viem";
import z from "zod";
import db from "@/lib/platform/db";
import {
	type JobOutboxKind,
	jobOutbox as jobOutboxTable,
} from "@/lib/platform/db/schema/job-outbox";
import { logger } from "@/lib/platform/pino";
import { addEmailOutboxToQueue } from "../queues";

export type JobOutboxInsert = InferInsertModel<typeof jobOutboxTable>;
export type JobOutboxRow = typeof jobOutboxTable.$inferSelect;
export type JobOutboxPayload = Record<string, unknown>;

const zAddress = z.string().transform((v) => getAddress(v as Address));

const zEmailIntent = z
	.enum(["initial", "reminder", "rotated"])
	.default("initial");

export const zDocReceivedOutboxPayload = z.object({
	to: z.email(),
	senderWallet: zAddress,
	pieceCid: z.string().min(1),
	senderName: z.string().optional(),
	documentTitle: z.string().min(1).optional(),
	intent: zEmailIntent,
});

export const zColdDocInviteOutboxPayload = z.object({
	to: z.email(),
	senderWallet: zAddress,
	pieceCid: z.string().min(1),
	inviteToken: z.string().min(16),
	senderName: z.string().optional(),
	documentTitle: z.string().min(1).optional(),
	intent: zEmailIntent,
});

export const zEnvelopeCompletedOutboxPayload = z.object({
	to: z.email(),
	senderWallet: zAddress,
	pieceCid: z.string().min(1),
	senderName: z.string().optional(),
	envelopeName: z.string().min(1),
});

export const zSignerTurnOutboxPayload = z.object({
	to: z.email(),
	senderWallet: zAddress,
	pieceCid: z.string().min(1),
	senderName: z.string().optional(),
	documentTitle: z.string().min(1).optional(),
	variant: z.enum(["warm", "cold"]),
	inviteToken: z.string().min(16).optional(),
});

export type DocReceivedOutboxPayload = z.infer<
	typeof zDocReceivedOutboxPayload
>;
export type ColdDocInviteOutboxPayload = z.infer<
	typeof zColdDocInviteOutboxPayload
>;
export type EnvelopeCompletedOutboxPayload = z.infer<
	typeof zEnvelopeCompletedOutboxPayload
>;
export type SignerTurnOutboxPayload = z.infer<typeof zSignerTurnOutboxPayload>;

export function parseOutboxPayload(
	kind: "doc_received",
	payload: Record<string, unknown>,
): DocReceivedOutboxPayload;
export function parseOutboxPayload(
	kind: "cold_doc_invite",
	payload: Record<string, unknown>,
): ColdDocInviteOutboxPayload;
export function parseOutboxPayload(
	kind: "envelope_completed",
	payload: Record<string, unknown>,
): EnvelopeCompletedOutboxPayload;
export function parseOutboxPayload(
	kind: "signer_turn",
	payload: Record<string, unknown>,
): SignerTurnOutboxPayload;
export function parseOutboxPayload(
	kind: JobOutboxKind,
	payload: Record<string, unknown>,
):
	| DocReceivedOutboxPayload
	| ColdDocInviteOutboxPayload
	| EnvelopeCompletedOutboxPayload
	| SignerTurnOutboxPayload {
	if (kind === "doc_received") {
		return zDocReceivedOutboxPayload.parse(payload);
	}
	if (kind === "envelope_completed") {
		return zEnvelopeCompletedOutboxPayload.parse(payload);
	}
	if (kind === "signer_turn") {
		return zSignerTurnOutboxPayload.parse(payload);
	}
	return zColdDocInviteOutboxPayload.parse(payload);
}

export async function insertJobOutboxRows(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	rows: JobOutboxInsert[],
): Promise<JobOutboxRow[]> {
	if (rows.length === 0) return [];
	return tx.insert(jobOutboxTable).values(rows).returning();
}

export async function loadUnprocessedOutboxByIds(
	ids: string[],
): Promise<JobOutboxRow[]> {
	if (ids.length === 0) return [];
	return db
		.select()
		.from(jobOutboxTable)
		.where(
			and(inArray(jobOutboxTable.id, ids), isNull(jobOutboxTable.processedAt)),
		);
}

export async function claimOutboxBatch(limit = 50): Promise<JobOutboxRow[]> {
	return db.transaction(async (tx) => {
		return tx
			.select()
			.from(jobOutboxTable)
			.where(isNull(jobOutboxTable.processedAt))
			.orderBy(asc(jobOutboxTable.createdAt))
			.limit(limit)
			.for("update", { skipLocked: true });
	});
}

export async function markOutboxProcessed(outboxId: string): Promise<void> {
	await db
		.update(jobOutboxTable)
		.set({ processedAt: new Date(), lastError: null })
		.where(
			and(eq(jobOutboxTable.id, outboxId), isNull(jobOutboxTable.processedAt)),
		);
}

export async function markOutboxFailed(
	outboxId: string,
	errorMessage: string,
): Promise<void> {
	await db
		.update(jobOutboxTable)
		.set({ lastError: errorMessage.slice(0, 2000) })
		.where(eq(jobOutboxTable.id, outboxId));
}

export async function summarizeStaleUnprocessedOutbox(args: {
	olderThan: Date;
}): Promise<{ count: number; oldestAgeMin: number } | null> {
	const rows = await db
		.select({ createdAt: jobOutboxTable.createdAt })
		.from(jobOutboxTable)
		.where(
			and(
				isNull(jobOutboxTable.processedAt),
				lt(jobOutboxTable.createdAt, args.olderThan),
			),
		)
		.orderBy(jobOutboxTable.createdAt)
		.limit(1);

	if (rows.length === 0) return null;

	const [{ count }] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(jobOutboxTable)
		.where(
			and(
				isNull(jobOutboxTable.processedAt),
				lt(jobOutboxTable.createdAt, args.olderThan),
			),
		);

	const oldest = rows[0]?.createdAt;
	if (!oldest || count <= 0) return null;

	return {
		count,
		oldestAgeMin: Math.round((Date.now() - oldest.getTime()) / 60_000),
	};
}

export async function listStaleUnprocessedOutbox(args: {
	olderThan: Date;
	limit: number;
}): Promise<JobOutboxRow[]> {
	return db
		.select()
		.from(jobOutboxTable)
		.where(
			and(
				isNull(jobOutboxTable.processedAt),
				lt(jobOutboxTable.createdAt, args.olderThan),
			),
		)
		.orderBy(jobOutboxTable.createdAt)
		.limit(args.limit);
}

export async function pruneProcessedOutboxOlderThan(
	cutoff: Date,
): Promise<number> {
	const deleted = await db
		.delete(jobOutboxTable)
		.where(
			and(
				isNotNull(jobOutboxTable.processedAt),
				lt(jobOutboxTable.processedAt, cutoff),
			),
		)
		.returning({ id: jobOutboxTable.id });
	return deleted.length;
}

export async function enqueueOutboxRows(
	rows: Pick<JobOutboxRow, "id" | "kind" | "idempotencyKey">[],
): Promise<void> {
	for (const row of rows) {
		try {
			await addEmailOutboxToQueue(row);
		} catch (err) {
			logger.warn(
				{ outboxId: row.id, err },
				"fast-path email enqueue failed; drainer will retry",
			);
		}
	}
}

export async function enqueueOutboxByIds(outboxIds: string[]): Promise<void> {
	const rows = await loadUnprocessedOutboxByIds(outboxIds);
	await enqueueOutboxRows(rows);
}

export async function enqueueClaimedOutboxRows(
	rows: JobOutboxRow[],
): Promise<number> {
	let enqueued = 0;
	for (const row of rows) {
		try {
			await addEmailOutboxToQueue(row);
			enqueued += 1;
		} catch (err) {
			logger.warn({ outboxId: row.id, err }, "outbox drainer enqueue failed");
		}
	}
	return enqueued;
}

const DRAIN_INTERVAL_MS = 15_000;
const DRAIN_BATCH_SIZE = 50;

let drainTimer: ReturnType<typeof setInterval> | null = null;

export async function runOutboxDrainerTick(): Promise<number> {
	const claimed = await claimOutboxBatch(DRAIN_BATCH_SIZE);
	if (claimed.length === 0) return 0;
	const enqueued = await enqueueClaimedOutboxRows(claimed);
	logger.debug({ claimed: claimed.length, enqueued }, "outbox drainer tick");
	return enqueued;
}

export function startOutboxDrainer(): void {
	if (drainTimer) return;
	drainTimer = setInterval(() => {
		void runOutboxDrainerTick().catch((err) => {
			logger.error({ err }, "outbox drainer tick failed");
		});
	}, DRAIN_INTERVAL_MS);
}

export function stopOutboxDrainer(): void {
	if (drainTimer) {
		clearInterval(drainTimer);
		drainTimer = null;
	}
}
