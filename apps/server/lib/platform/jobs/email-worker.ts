import { type ConnectionOptions, Worker } from "bullmq";
import { logger } from "@/lib/platform/pino";
import { EMAIL_QUEUE_NAME, getBullmqPrefix } from "./bullmq-prefix";
import { getWorkerConnection } from "./connection";
import type { EmailQueueJobData } from "./email-queue";
import { processEmailOutboxJob } from "./process-email-outbox-job";

/** Resend ~10/s; SES similar — stay under provider limits. */
const EMAIL_WORKER_CONCURRENCY = 2;
const EMAIL_RATE_MAX = 8;
const EMAIL_RATE_DURATION_MS = 1000;

let emailWorker: Worker<EmailQueueJobData> | null = null;

export function startEmailWorker(): Worker<EmailQueueJobData> {
	if (emailWorker) return emailWorker;

	emailWorker = new Worker<EmailQueueJobData>(
		EMAIL_QUEUE_NAME,
		async (job) => processEmailOutboxJob(job.data),
		{
			connection: getWorkerConnection() as ConnectionOptions,
			prefix: getBullmqPrefix(),
			concurrency: EMAIL_WORKER_CONCURRENCY,
			limiter: {
				max: EMAIL_RATE_MAX,
				duration: EMAIL_RATE_DURATION_MS,
			},
		},
	);

	emailWorker.on(
		"failed",
		(
			job: { id?: string; data?: EmailQueueJobData } | undefined,
			err: Error,
		) => {
			logger.error(
				{ jobId: job?.id, outboxId: job?.data?.outboxId, err },
				"email queue job failed",
			);
		},
	);

	return emailWorker;
}

export async function closeEmailWorker(): Promise<void> {
	if (emailWorker) {
		await emailWorker.close();
		emailWorker = null;
	}
}
