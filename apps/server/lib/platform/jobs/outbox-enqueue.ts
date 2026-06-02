import { logger } from "@/lib/platform/pino";
import { addEmailOutboxToQueue } from "./email-queue";
import { type JobOutboxRow, loadUnprocessedOutboxByIds } from "./outbox-store";

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
