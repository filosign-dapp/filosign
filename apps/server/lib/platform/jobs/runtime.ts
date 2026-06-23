import { isFocBackupEnabled } from "@/lib/domains/foc/enabled";
import { runsHttpServer, runsWorkerTasks } from "@/lib/platform/role";
import {
	closeJobsQueues,
	getBillingWebhookQueue,
	getEmailQueue,
	getFileRegisterQueue,
	getFocTransitionQueue,
	getIndexerQueue,
	getPayoutQueue,
	getPostSignRoutingQueue,
} from "./queues";
import { closeJobConnections } from "./utils/connection";
import { startOutboxDrainer, stopOutboxDrainer } from "./utils/outbox";
import {
	closeAllWorkers,
	startBillingWebhookWorker,
	startEmailWorker,
	startFileRegisterRetryWorker,
	startFileRegisterWorker,
	startFocTransitionWorker,
	startIndexerWorker,
	startPayoutWorker,
	startPostSignRoutingWorker,
} from "./workers";

export type JobsRuntimeOptions = {
	/** BullMQ consumers + 15s outbox drainer */
	worker: boolean;
	/** Warm queue clients for post-commit enqueue (API fast path) */
	producer: boolean;
};

export function startJobsRuntime(options: JobsRuntimeOptions): void {
	if (options.producer) {
		getEmailQueue();
		getPayoutQueue();
		getPostSignRoutingQueue();
		getIndexerQueue();
		getBillingWebhookQueue();
		if (isFocBackupEnabled()) {
			getFocTransitionQueue();
		}
		getFileRegisterQueue();
	}
	if (options.worker) {
		startEmailWorker();
		startPayoutWorker();
		startPostSignRoutingWorker();
		startIndexerWorker();
		startBillingWebhookWorker();
		if (isFocBackupEnabled()) {
			startFocTransitionWorker();
		}
		startFileRegisterWorker();
		startFileRegisterRetryWorker();
		startOutboxDrainer();
	}
}

export async function shutdownJobsRuntime(
	options: JobsRuntimeOptions,
): Promise<void> {
	if (options.worker) {
		stopOutboxDrainer();
		await closeAllWorkers();
	}
	// Worker opens email queue via outbox drainer; API warms all queues as producer.
	if (options.producer || options.worker) {
		await closeJobsQueues();
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
