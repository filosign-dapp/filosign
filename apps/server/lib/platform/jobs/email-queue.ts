import { type ConnectionOptions, Queue } from "bullmq";
import { EMAIL_QUEUE_NAME, getBullmqPrefix } from "./bullmq-prefix";
import { getQueueConnection } from "./connection";
import type { JobOutboxRow } from "./outbox-store";

export type EmailQueueJobData = {
	outboxId: string;
	kind: JobOutboxRow["kind"];
	idempotencyKey: string;
};

let emailQueue: Queue<EmailQueueJobData> | null = null;

export function getEmailQueue(): Queue<EmailQueueJobData> {
	if (!emailQueue) {
		emailQueue = new Queue<EmailQueueJobData>(EMAIL_QUEUE_NAME, {
			connection: getQueueConnection() as ConnectionOptions,
			prefix: getBullmqPrefix(),
			defaultJobOptions: {
				removeOnComplete: { age: 86_400 },
				removeOnFail: { age: 604_800 },
				attempts: 5,
				backoff: { type: "exponential", delay: 5000 },
			},
		});
	}
	return emailQueue;
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
		{ jobId: row.idempotencyKey },
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

export async function closeEmailQueue(): Promise<void> {
	if (emailQueue) {
		await emailQueue.close();
		emailQueue = null;
	}
}
