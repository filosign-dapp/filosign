import { runsHttpServer, runsWorkerTasks } from "@/lib/platform/server-role";
import { closeJobConnections } from "./connection";
import { closeEmailQueue, getEmailQueue } from "./email-queue";
import { closeEmailWorker, startEmailWorker } from "./email-worker";
import { startOutboxDrainer, stopOutboxDrainer } from "./outbox-drainer";

export type JobsRuntimeOptions = {
	/** BullMQ email consumer + 15s outbox drainer */
	worker: boolean;
	/** Warm queue client for post-commit enqueue (API fast path) */
	producer: boolean;
};

export function startJobsRuntime(options: JobsRuntimeOptions): void {
	if (options.producer) {
		getEmailQueue();
	}
	if (options.worker) {
		startEmailWorker();
		startOutboxDrainer();
	}
}

export async function shutdownJobsRuntime(
	options: JobsRuntimeOptions,
): Promise<void> {
	if (options.worker) {
		stopOutboxDrainer();
		await closeEmailWorker();
	}
	if (options.producer || options.worker) {
		await closeEmailQueue();
	}
	if (options.producer || options.worker) {
		await closeJobConnections();
	}
}

export function resolveJobsRuntimeOptions(): JobsRuntimeOptions {
	return {
		producer: runsHttpServer(),
		worker: runsWorkerTasks(),
	};
}
