import { eq } from "drizzle-orm";
import db from "@/lib/platform/db";
import { jobOutbox } from "@/lib/platform/db/schema/job-outbox";
import { logger } from "@/lib/platform/pino";
import type { EmailQueueJobData } from "./email-queue";
import { markOutboxFailed, markOutboxProcessed } from "./outbox-store";
import { processEmailFromOutbox } from "./process-email-from-outbox";

/** BullMQ handler: load outbox row, deliver, mark processed only after success. */
export async function processEmailOutboxJob(
	data: EmailQueueJobData,
): Promise<void> {
	const { outboxId, kind } = data;

	const [row] = await db
		.select()
		.from(jobOutbox)
		.where(eq(jobOutbox.id, outboxId))
		.limit(1);

	if (!row) {
		logger.warn({ outboxId }, "email job missing outbox row");
		return;
	}
	if (row.processedAt) return;

	try {
		await processEmailFromOutbox(kind, row.payload);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		await markOutboxFailed(outboxId, message);
		throw err;
	}
	await markOutboxProcessed(outboxId);
}
