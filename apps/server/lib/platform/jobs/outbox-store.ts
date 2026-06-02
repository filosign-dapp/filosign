import type { InferInsertModel } from "drizzle-orm";
import { and, asc, eq, inArray, isNotNull, isNull, lt } from "drizzle-orm";
import db from "@/lib/platform/db";
import type {
	JobOutboxKind,
	jobOutbox,
} from "@/lib/platform/db/schema/job-outbox";

const { jobOutbox: jobOutboxTable } = db.schema;

export type JobOutboxInsert = InferInsertModel<typeof jobOutbox>;

export type JobOutboxRow = typeof jobOutbox.$inferSelect;

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

export function outboxKindLabel(kind: JobOutboxKind): string {
	return kind;
}
