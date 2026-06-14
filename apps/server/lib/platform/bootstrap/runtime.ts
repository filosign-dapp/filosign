import env from "@/env";
import { logFocSmoke } from "@/lib/domains/foc/smoke-log";
import {
	emitEmailDisabledWarning,
	emitServerStartedPing,
	shutdownPostHog,
} from "@/lib/platform/analytics";
import { initCache } from "@/lib/platform/cache/session";
import { startPlatformCron, stopPlatformCron } from "@/lib/platform/cron";
import {
	resolveJobsRuntimeOptions,
	shutdownJobsRuntime,
	startJobsRuntime,
} from "@/lib/platform/jobs";
import { runsHttpServer, runsWorkerTasks } from "@/lib/platform/role";
import {
	startWorkerHeartbeat,
	stopWorkerHeartbeat,
} from "@/lib/platform/worker/heartbeat";
import {
	startWorkerLivenessMonitor,
	stopWorkerLivenessMonitor,
} from "@/lib/platform/worker/monitor";
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
	logFocSmoke("server bootstrap ok (TEST_FOC smoke logging enabled)", {
		serverRole: env.SERVER_ROLE,
		chain: env.CHAIN,
	});
	await initCache();
	const jobs = resolveJobsRuntimeOptions();
	startJobsRuntime({
		producer: jobs.producer,
		worker: jobs.worker && options.crons,
	});
	if (options.crons) startPlatformCron();
	if (options.heartbeat) startWorkerHeartbeat();
	if (runsHttpServer()) startWorkerLivenessMonitor();
	if (
		runsWorkerTasks() &&
		env.DEPLOYMENT !== "local" &&
		!env.RESEND_ENABLED &&
		!env.SES_ENABLED
	) {
		void emitEmailDisabledWarning();
	}
	await emitServerStartedPing();
}

export async function shutdownPlatformRuntime(
	options: PlatformRuntimeOptions,
): Promise<void> {
	if (options.heartbeat) stopWorkerHeartbeat();
	stopWorkerLivenessMonitor();
	if (options.crons) stopPlatformCron();
	const jobs = resolveJobsRuntimeOptions();
	await shutdownJobsRuntime({
		producer: jobs.producer,
		worker: jobs.worker && options.crons,
	});
	await shutdownPostHog();
}
