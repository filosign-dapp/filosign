import { eq } from "drizzle-orm";
import db from "@/lib/platform/db";

const { billingWebhookEvents } = db.schema;

export function emailJobId(idempotencyKey: string): string {
	return idempotencyKey;
}

/** BullMQ rejects `:` in custom jobId - use `__` as namespace separator. */
const JOB_ID_SEP = "__";

export function payoutJobId(pieceCid: string): string {
	return `payout${JOB_ID_SEP}${pieceCid}`;
}

export function postSignRoutingJobId(pieceCid: string): string {
	return `routing${JOB_ID_SEP}${pieceCid}`;
}

export function indexerJobId(txHash: string): string {
	return `indexer${JOB_ID_SEP}${txHash.toLowerCase()}`;
}

export function billingWebhookJobId(webhookId: string): string {
	return `billing${JOB_ID_SEP}${webhookId}`;
}

export function focTransitionJobId(pieceCid: string): string {
	return `foc${JOB_ID_SEP}${pieceCid}`;
}

/** Returns true when the webhook row is already terminal (safe no-op for workers). */
export async function isBillingWebhookProcessed(
	providerEventId: string,
): Promise<boolean> {
	const [row] = await db
		.select({ status: billingWebhookEvents.status })
		.from(billingWebhookEvents)
		.where(eq(billingWebhookEvents.providerEventId, providerEventId))
		.limit(1);
	return row?.status === "processed";
}
