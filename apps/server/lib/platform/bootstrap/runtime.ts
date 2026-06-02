import { shutdownPostHog } from "@/lib/platform/analytics";
import { initCache } from "@/lib/platform/cache/session";
import { startPlatformCron, stopPlatformCron } from "@/lib/platform/cron";
import {
	resolveJobsRuntimeOptions,
	shutdownJobsRuntime,
	startJobsRuntime,
} from "@/lib/platform/jobs";
import {
	startWorkerHeartbeat,
	stopWorkerHeartbeat,
} from "@/lib/platform/worker/heartbeat";
import { validateServerBootstrap } from "./validate-bootstrap";
import { validateServerRoleForDeployment } from "./validate-role";

export type PlatformRuntimeOptions = {
	crons: boolean;
	heartbeat: boolean;
};

export async function bootstrapPlatformRuntime(
	options: PlatformRuntimeOptions,
): Promise<void> {
	validateServerRoleForDeployment();
	await validateServerBootstrap();
	await initCache();
	const jobs = resolveJobsRuntimeOptions();
	startJobsRuntime({
		producer: jobs.producer,
		worker: jobs.worker && options.crons,
	});
	if (options.crons) startPlatformCron();
	if (options.heartbeat) startWorkerHeartbeat();
}

export async function shutdownPlatformRuntime(
	options: PlatformRuntimeOptions,
): Promise<void> {
	if (options.heartbeat) stopWorkerHeartbeat();
	if (options.crons) stopPlatformCron();
	const jobs = resolveJobsRuntimeOptions();
	await shutdownJobsRuntime({
		producer: jobs.producer,
		worker: jobs.worker && options.crons,
	});
	await shutdownPostHog();
}
