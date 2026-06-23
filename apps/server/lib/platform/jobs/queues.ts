import { Queue } from "bullmq";
import type { Hex } from "viem";
import { getQueueConnection } from "./utils/connection";
import {
	billingWebhookJobId,
	emailJobId,
	fileRegisterJobId,
	fileRegisterRetryJobId,
	focTransitionJobId,
	indexerJobId,
	payoutJobId,
	postSignRoutingJobId,
} from "./utils/idempotency";
import type { JobOutboxRow } from "./utils/outbox";
import {
	BILLING_WEBHOOK_QUEUE_NAME,
	DEFAULT_QUEUE_JOB_OPTIONS,
	EMAIL_QUEUE_NAME,
	FILE_REGISTER_QUEUE_NAME,
	FILE_REGISTER_RETRY_QUEUE_NAME,
	FOC_TRANSITION_QUEUE_NAME,
	getBullmqPrefix,
	INDEXER_QUEUE_NAME,
	PAYOUT_QUEUE_NAME,
	POST_SIGN_CHAIN_DELAY_MS,
	POST_SIGN_CHAIN_JOB_OPTIONS,
	POST_SIGN_ROUTING_QUEUE_NAME,
} from "./utils/queue-config";

export type EmailQueueJobData = {
	outboxId: string;
	kind: JobOutboxRow["kind"];
	idempotencyKey: string;
};

export type PostSignChainQueueJobData = {
	pieceCid: string;
	signTxHash?: Hex;
};

export type PayoutQueueJobData = PostSignChainQueueJobData;

export type PostSignRoutingQueueJobData = PostSignChainQueueJobData;

export type IndexerQueueJobData = {
	txHash: `0x${string}`;
	body: Record<string, unknown>;
};

export type BillingWebhookQueueJobData = { webhookId: string };

export type FocTransitionQueueJobData = { pieceCid: string };

export type FileRegisterQueueJobData = { pieceCid: string };

export type FileRegisterRetryQueueJobData = { pieceCid: string };

let emailQueue: Queue<EmailQueueJobData> | null = null;
let payoutQueue: Queue<PayoutQueueJobData> | null = null;
let postSignRoutingQueue: Queue<PostSignRoutingQueueJobData> | null = null;
let indexerQueue: Queue<IndexerQueueJobData> | null = null;
let billingWebhookQueue: Queue<BillingWebhookQueueJobData> | null = null;
let focTransitionQueue: Queue<FocTransitionQueueJobData> | null = null;
let fileRegisterQueue: Queue<FileRegisterQueueJobData> | null = null;
let fileRegisterRetryQueue: Queue<FileRegisterRetryQueueJobData> | null = null;

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

export function getPostSignRoutingQueue(): Queue<PostSignRoutingQueueJobData> {
	if (!postSignRoutingQueue) {
		postSignRoutingQueue = new Queue<PostSignRoutingQueueJobData>(
			POST_SIGN_ROUTING_QUEUE_NAME,
			queueOptions(),
		);
	}
	return postSignRoutingQueue;
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

export function getFileRegisterQueue(): Queue<FileRegisterQueueJobData> {
	if (!fileRegisterQueue) {
		fileRegisterQueue = new Queue<FileRegisterQueueJobData>(
			FILE_REGISTER_QUEUE_NAME,
			queueOptions(),
		);
	}
	return fileRegisterQueue;
}

export function getFileRegisterRetryQueue(): Queue<FileRegisterRetryQueueJobData> {
	if (!fileRegisterRetryQueue) {
		fileRegisterRetryQueue = new Queue<FileRegisterRetryQueueJobData>(
			FILE_REGISTER_RETRY_QUEUE_NAME,
			queueOptions(),
		);
	}
	return fileRegisterRetryQueue;
}

export async function enqueueFileRegister(pieceCid: string): Promise<void> {
	await getFileRegisterQueue().add(
		"register",
		{ pieceCid },
		{ jobId: fileRegisterJobId(pieceCid) },
	);
}

export async function enqueueFileRegisterRetry(
	pieceCid: string,
): Promise<void> {
	await getFileRegisterRetryQueue().add(
		"retry",
		{ pieceCid },
		{ jobId: fileRegisterRetryJobId(pieceCid) },
	);
}

export async function enqueueFocTransition(pieceCid: string): Promise<void> {
	const { isFocBackupEnabled } = await import("@/lib/domains/foc/enabled");
	if (!isFocBackupEnabled()) {
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

async function addPostSignChainJob(
	queue: Queue<PostSignChainQueueJobData>,
	name: string,
	jobId: string,
	pieceCid: string,
	options?: { signTxHash?: Hex },
): Promise<void> {
	const existing = await queue.getJob(jobId);
	if (existing) {
		const state = await existing.getState();
		if (state === "completed" || state === "failed") {
			await existing.remove();
		}
	}

	await queue.add(
		name,
		{
			pieceCid,
			...(options?.signTxHash ? { signTxHash: options.signTxHash } : {}),
		},
		{
			jobId,
			...POST_SIGN_CHAIN_JOB_OPTIONS,
			...(options?.signTxHash ? { delay: POST_SIGN_CHAIN_DELAY_MS } : {}),
		},
	);
}

export async function enqueuePayoutForPiece(
	pieceCid: string,
	options?: { signTxHash?: Hex },
): Promise<void> {
	await addPostSignChainJob(
		getPayoutQueue(),
		"execute",
		payoutJobId(pieceCid),
		pieceCid,
		options,
	);
}

export async function enqueuePostSignRoutingComplete(
	pieceCid: string,
	options?: { signTxHash?: Hex },
): Promise<void> {
	await addPostSignChainJob(
		getPostSignRoutingQueue(),
		"check",
		postSignRoutingJobId(pieceCid),
		pieceCid,
		options,
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
	if (postSignRoutingQueue) {
		closes.push(postSignRoutingQueue.close());
		postSignRoutingQueue = null;
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
	if (fileRegisterQueue) {
		closes.push(fileRegisterQueue.close());
		fileRegisterQueue = null;
	}
	if (fileRegisterRetryQueue) {
		closes.push(fileRegisterRetryQueue.close());
		fileRegisterRetryQueue = null;
	}
	await Promise.all(closes);
}
