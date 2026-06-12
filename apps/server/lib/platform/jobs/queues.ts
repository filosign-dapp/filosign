import { Queue } from "bullmq";
import type { Hex } from "viem";
import { getQueueConnection } from "./utils/connection";
import {
	billingWebhookJobId,
	emailJobId,
	focTransitionJobId,
	indexerJobId,
	payoutJobId,
} from "./utils/idempotency";
import type { JobOutboxRow } from "./utils/outbox";
import {
	BILLING_WEBHOOK_QUEUE_NAME,
	DEFAULT_QUEUE_JOB_OPTIONS,
	EMAIL_QUEUE_NAME,
	FOC_TRANSITION_QUEUE_NAME,
	getBullmqPrefix,
	INDEXER_QUEUE_NAME,
	PAYOUT_QUEUE_JOB_OPTIONS,
	PAYOUT_QUEUE_NAME,
} from "./utils/queue-config";

export type EmailQueueJobData = {
	outboxId: string;
	kind: JobOutboxRow["kind"];
	idempotencyKey: string;
};

export type PayoutQueueJobData = {
	pieceCid: string;
	signTxHash?: Hex;
};

const POST_SIGN_PAYOUT_DELAY_MS = 1500;

export type IndexerQueueJobData = {
	txHash: `0x${string}`;
	body: Record<string, unknown>;
};

export type BillingWebhookQueueJobData = { webhookId: string };

export type FocTransitionQueueJobData = { pieceCid: string };

let emailQueue: Queue<EmailQueueJobData> | null = null;
let payoutQueue: Queue<PayoutQueueJobData> | null = null;
let indexerQueue: Queue<IndexerQueueJobData> | null = null;
let billingWebhookQueue: Queue<BillingWebhookQueueJobData> | null = null;
let focTransitionQueue: Queue<FocTransitionQueueJobData> | null = null;

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

export function getFocTransitionQueue(): Queue<FocTransitionQueueJobData> {
	if (!focTransitionQueue) {
		focTransitionQueue = new Queue<FocTransitionQueueJobData>(
			FOC_TRANSITION_QUEUE_NAME,
			queueOptions(),
		);
	}
	return focTransitionQueue;
}

export async function enqueueFocTransition(pieceCid: string): Promise<void> {
	const { isFocEnabled } = await import("@/lib/domains/foc/enabled");
	if (!isFocEnabled()) {
		return;
	}

	await getFocTransitionQueue().add(
		"transition",
		{ pieceCid },
		{ jobId: focTransitionJobId(pieceCid) },
	);
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

export async function enqueuePayoutForPiece(
	pieceCid: string,
	options?: { signTxHash?: Hex },
): Promise<void> {
	await getPayoutQueue().add(
		"execute",
		{
			pieceCid,
			...(options?.signTxHash ? { signTxHash: options.signTxHash } : {}),
		},
		{
			jobId: payoutJobId(pieceCid),
			...PAYOUT_QUEUE_JOB_OPTIONS,
			...(options?.signTxHash ? { delay: POST_SIGN_PAYOUT_DELAY_MS } : {}),
		},
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
	if (focTransitionQueue) {
		closes.push(focTransitionQueue.close());
		focTransitionQueue = null;
	}
	await Promise.all(closes);
}
