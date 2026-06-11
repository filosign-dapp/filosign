import { Worker } from "bullmq";
import { processDodoWebhookJob } from "@/lib/domains/billing";
import { runFocTransitionForPiece } from "@/lib/domains/foc";
import { tryExecuteSettlementRulesForPiece } from "@/lib/domains/settlements/utils/execute/payout";
import { SettlementPayoutRetryableError } from "@/lib/domains/settlements/utils/execute/payout-readiness";
import { evmClient } from "@/lib/platform/evm";
import { processTransaction } from "@/lib/platform/indexer/process";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import type {
	BillingWebhookQueueJobData,
	EmailQueueJobData,
	FocTransitionQueueJobData,
	IndexerQueueJobData,
	PayoutQueueJobData,
} from "./queues";
import { getWorkerConnection } from "./utils/connection";
import { processEmailOutboxJob } from "./utils/process-email";
import {
	attachWorkerFailedHandler,
	BILLING_WEBHOOK_QUEUE_NAME,
	EMAIL_QUEUE_NAME,
	FOC_TRANSITION_QUEUE_NAME,
	getBullmqPrefix,
	INDEXER_QUEUE_NAME,
	PAYOUT_QUEUE_NAME,
} from "./utils/queue-config";

// Concurrency and limiter constants
const EMAIL_WORKER_CONCURRENCY = 2;
const EMAIL_RATE_MAX = 8;
const EMAIL_RATE_DURATION_MS = 1000;

const PAYOUT_CONCURRENCY = 1;
const INDEXER_CONCURRENCY = 5;
const BILLING_WEBHOOK_CONCURRENCY = 3;
const FOC_TRANSITION_CONCURRENCY = 2;

// Singleton worker references
let emailWorker: Worker<EmailQueueJobData> | null = null;
let payoutWorker: Worker<PayoutQueueJobData> | null = null;
let indexerWorker: Worker<IndexerQueueJobData> | null = null;
let billingWebhookWorker: Worker<BillingWebhookQueueJobData> | null = null;
let focTransitionWorker: Worker<FocTransitionQueueJobData> | null = null;

function commonWorkerOptions() {
	return {
		connection: getWorkerConnection(),
		prefix: getBullmqPrefix(),
	};
}

export function startEmailWorker(): Worker<EmailQueueJobData> {
	if (emailWorker) return emailWorker;

	emailWorker = new Worker<EmailQueueJobData>(
		EMAIL_QUEUE_NAME,
		async (job) => processEmailOutboxJob(job.data),
		{
			...commonWorkerOptions(),
			concurrency: EMAIL_WORKER_CONCURRENCY,
			limiter: {
				max: EMAIL_RATE_MAX,
				duration: EMAIL_RATE_DURATION_MS,
			},
		},
	);

	attachWorkerFailedHandler(emailWorker, EMAIL_QUEUE_NAME, {
		alertContext: (job) =>
			job?.data?.outboxId ? { outboxId: job.data.outboxId } : {},
	});

	return emailWorker;
}

export function startPayoutWorker(): Worker<PayoutQueueJobData> {
	if (payoutWorker) return payoutWorker;

	payoutWorker = new Worker<PayoutQueueJobData>(
		PAYOUT_QUEUE_NAME,
		async (job) => {
			if (job.data.signTxHash) {
				await tryCatch(
					evmClient.waitForTransactionReceipt({ hash: job.data.signTxHash }),
				);
			}

			const outcome = await tryExecuteSettlementRulesForPiece(
				job.data.pieceCid,
			);
			if (outcome.retryable) {
				throw new SettlementPayoutRetryableError(
					outcome.retryReason ?? "retryable",
					job.data.pieceCid,
				);
			}
		},
		{
			...commonWorkerOptions(),
			concurrency: PAYOUT_CONCURRENCY,
		},
	);

	attachWorkerFailedHandler(payoutWorker, PAYOUT_QUEUE_NAME);
	return payoutWorker;
}

export function startIndexerWorker(): Worker<IndexerQueueJobData> {
	if (indexerWorker) return indexerWorker;

	indexerWorker = new Worker<IndexerQueueJobData>(
		INDEXER_QUEUE_NAME,
		async (job) => {
			await processTransaction(job.data.txHash, job.data.body);
		},
		{
			...commonWorkerOptions(),
			concurrency: INDEXER_CONCURRENCY,
		},
	);

	attachWorkerFailedHandler(indexerWorker, INDEXER_QUEUE_NAME);
	return indexerWorker;
}

export function startBillingWebhookWorker(): Worker<BillingWebhookQueueJobData> {
	if (billingWebhookWorker) return billingWebhookWorker;

	billingWebhookWorker = new Worker<BillingWebhookQueueJobData>(
		BILLING_WEBHOOK_QUEUE_NAME,
		async (job) => {
			await processDodoWebhookJob(job.data.webhookId);
		},
		{
			...commonWorkerOptions(),
			concurrency: BILLING_WEBHOOK_CONCURRENCY,
		},
	);

	attachWorkerFailedHandler(billingWebhookWorker, BILLING_WEBHOOK_QUEUE_NAME);
	return billingWebhookWorker;
}

export function startFocTransitionWorker(): Worker<FocTransitionQueueJobData> {
	if (focTransitionWorker) return focTransitionWorker;

	focTransitionWorker = new Worker<FocTransitionQueueJobData>(
		FOC_TRANSITION_QUEUE_NAME,
		async (job) => {
			await runFocTransitionForPiece(job.data.pieceCid);
		},
		{
			...commonWorkerOptions(),
			concurrency: FOC_TRANSITION_CONCURRENCY,
		},
	);

	attachWorkerFailedHandler(focTransitionWorker, FOC_TRANSITION_QUEUE_NAME, {
		alertContext: (job) =>
			job?.data?.pieceCid ? { pieceCid: job.data.pieceCid } : {},
	});

	return focTransitionWorker;
}

export function startAllWorkers(): void {
	startEmailWorker();
	startPayoutWorker();
	startIndexerWorker();
	startBillingWebhookWorker();
	startFocTransitionWorker();
}

export async function closeEmailWorker(): Promise<void> {
	if (emailWorker) {
		await emailWorker.close();
		emailWorker = null;
	}
}

export async function closePayoutWorker(): Promise<void> {
	if (payoutWorker) {
		await payoutWorker.close();
		payoutWorker = null;
	}
}

export async function closeIndexerWorker(): Promise<void> {
	if (indexerWorker) {
		await indexerWorker.close();
		indexerWorker = null;
	}
}

export async function closeBillingWebhookWorker(): Promise<void> {
	if (billingWebhookWorker) {
		await billingWebhookWorker.close();
		billingWebhookWorker = null;
	}
}

export async function closeFocTransitionWorker(): Promise<void> {
	if (focTransitionWorker) {
		await focTransitionWorker.close();
		focTransitionWorker = null;
	}
}

export async function closeAllWorkers(): Promise<void> {
	await Promise.all([
		closeEmailWorker(),
		closePayoutWorker(),
		closeIndexerWorker(),
		closeBillingWebhookWorker(),
		closeFocTransitionWorker(),
	]);
}
