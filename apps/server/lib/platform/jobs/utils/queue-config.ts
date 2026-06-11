import type { Job, Worker } from "bullmq";
import env from "@/env";
import {
	emitCriticalPlatformEvent,
	PLATFORM_ALERT_EVENTS,
} from "@/lib/platform/analytics";
import { logger } from "@/lib/platform/pino";

export function getBullmqPrefix(): string {
	return env.BULLMQ_PREFIX;
}

export const EMAIL_QUEUE_NAME = "email";
export const PAYOUT_QUEUE_NAME = "payout-execution";
export const INDEXER_QUEUE_NAME = "transaction-indexing";
export const BILLING_WEBHOOK_QUEUE_NAME = "billing-webhook";
export const FOC_TRANSITION_QUEUE_NAME = "foc-transition";

/** Shared BullMQ job options (Sprint 4+). */
export const DEFAULT_QUEUE_JOB_OPTIONS = {
	removeOnComplete: { age: 86_400 },
	removeOnFail: { age: 604_800 },
	attempts: 5,
	backoff: { type: "exponential" as const, delay: 5000 },
} as const;

/** Payout jobs: 3 attempts with exponential backoff for canExecute / partial retries. */
export const PAYOUT_QUEUE_JOB_OPTIONS = {
	removeOnComplete: { age: 86_400 },
	removeOnFail: { age: 604_800 },
	attempts: 3,
	backoff: { type: "exponential" as const, delay: 5000 },
} as const;

function jobAttemptsExhausted(job: Job | undefined): boolean {
	if (!job) return false;
	const maxAttempts =
		typeof job.opts.attempts === "number"
			? job.opts.attempts
			: DEFAULT_QUEUE_JOB_OPTIONS.attempts;
	return job.attemptsMade >= maxAttempts;
}

export type WorkerFailedAlertContext = Record<string, unknown>;

export function attachWorkerFailedHandler(
	worker: Worker,
	queueName: string,
	options?: {
		alertContext?: (job: Job | undefined) => WorkerFailedAlertContext;
	},
): void {
	worker.on("failed", (job, err) => {
		if (!jobAttemptsExhausted(job)) {
			logger.warn(
				{ queueName, jobId: job?.id, attemptsMade: job?.attemptsMade, err },
				"bullmq job attempt failed",
			);
			return;
		}

		const errorMessage = err instanceof Error ? err.message : String(err);
		logger.error(
			{ queueName, jobId: job?.id, err },
			"bullmq job failed (DLQ / retries exhausted)",
		);

		const extra = options?.alertContext?.(job) ?? {};
		const outboxId =
			typeof extra.outboxId === "string" ? extra.outboxId : undefined;

		void emitCriticalPlatformEvent({
			name: PLATFORM_ALERT_EVENTS.serverBullmqJobFailed,
			severity: "error",
			message: `BullMQ job failed on ${queueName}`,
			context: {
				queueName,
				jobId: job?.id ?? "unknown",
				error: errorMessage,
				...(outboxId ? { outboxId } : {}),
			},
		});
	});
}
