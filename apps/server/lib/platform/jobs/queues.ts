import { Queue } from "bullmq";
import { getQueueConnection } from "./utils/connection";
import {
	billingWebhookJobId,
	emailJobId,
	indexerJobId,
	payoutJobId,
} from "./utils/idempotency";
import type { JobOutboxRow } from "./utils/outbox";
import {
	BILLING_WEBHOOK_QUEUE_NAME,
	DEFAULT_QUEUE_JOB_OPTIONS,
	EMAIL_QUEUE_NAME,
	getBullmqPrefix,
	INDEXER_QUEUE_NAME,
	PAYOUT_QUEUE_NAME,
} from "./utils/queue-config";

export type EmailQueueJobData = {
	outboxId: string;
	kind: JobOutboxRow["kind"];
	idempotencyKey: string;
};

export type PayoutQueueJobData = { pieceCid: string };

export type IndexerQueueJobData = {
	txHash: `0x${string}`;
	body: Record<string, unknown>;
};

export type BillingWebhookQueueJobData = { webhookId: string };

let emailQueue: Queue<EmailQueueJobData> | null = null;
let payoutQueue: Queue<PayoutQueueJobData> | null = null;
let indexerQueue: Queue<IndexerQueueJobData> | null = null;
let billingWebhookQueue: Queue<BillingWebhookQueueJobData> | null = null;

function queueOptions() {
	return {
		connection: getQueueConnection(),
		prefix: getBullmqPrefix(),
		defaultJobOptions: DEFAULT_QUEUE_JOB_OPTIONS,
	};
}

export function getEmailQueue(): Queue<EmailQueueJobData> {
	if (!emailQueue) {
		emailQueue = new Queue<EmailQueueJobData>(EMAIL_QUEUE_NAME, queueOptions());
	}
	return emailQueue;
}

export function getPayoutQueue(): Queue<PayoutQueueJobData> {
	if (!payoutQueue) {
		payoutQueue = new Queue<PayoutQueueJobData>(
			PAYOUT_QUEUE_NAME,
			queueOptions(),
		);
	}
	return payoutQueue;
}

export function getIndexerQueue(): Queue<IndexerQueueJobData> {
	if (!indexerQueue) {
		indexerQueue = new Queue<IndexerQueueJobData>(
			INDEXER_QUEUE_NAME,
			queueOptions(),
		);
	}
	return indexerQueue;
}

export function getBillingWebhookQueue(): Queue<BillingWebhookQueueJobData> {
	if (!billingWebhookQueue) {
		billingWebhookQueue = new Queue<BillingWebhookQueueJobData>(
			BILLING_WEBHOOK_QUEUE_NAME,
			queueOptions(),
		);
	}
	return billingWebhookQueue;
}

export async function addEmailOutboxToQueue(
	row: Pick<JobOutboxRow, "id" | "kind" | "idempotencyKey">,
): Promise<boolean> {
	const queue = getEmailQueue();
	const job = await queue.add(
		row.kind,
		{
			outboxId: row.id,
			kind: row.kind,
			idempotencyKey: row.idempotencyKey,
		},
		{ jobId: emailJobId(row.idempotencyKey) },
	);
	return job.id === row.idempotencyKey;
}

export async function isEmailJobActive(
	idempotencyKey: string,
): Promise<boolean> {
	const queue = getEmailQueue();
	const job = await queue.getJob(idempotencyKey);
	if (!job) return false;
	const state = await job.getState();
	return state === "active" || state === "waiting" || state === "delayed";
}

export async function enqueuePayoutForPiece(pieceCid: string): Promise<void> {
	await getPayoutQueue().add(
		"execute",
		{ pieceCid },
		{ jobId: payoutJobId(pieceCid) },
	);
}

export async function enqueueIndexerTransaction(args: {
	txHash: `0x${string}`;
	body: Record<string, unknown>;
}): Promise<void> {
	await getIndexerQueue().add(
		"index",
		{ txHash: args.txHash, body: args.body },
		{ jobId: indexerJobId(args.txHash) },
	);
}

export async function enqueueBillingWebhook(webhookId: string): Promise<void> {
	await getBillingWebhookQueue().add(
		"process",
		{ webhookId },
		{ jobId: billingWebhookJobId(webhookId) },
	);
}

export async function closeJobsQueues(): Promise<void> {
	const closes: Promise<unknown>[] = [];
	if (emailQueue) {
		closes.push(emailQueue.close());
		emailQueue = null;
	}
	if (payoutQueue) {
		closes.push(payoutQueue.close());
		payoutQueue = null;
	}
	if (indexerQueue) {
		closes.push(indexerQueue.close());
		indexerQueue = null;
	}
	if (billingWebhookQueue) {
		closes.push(billingWebhookQueue.close());
		billingWebhookQueue = null;
	}
	await Promise.all(closes);
}
