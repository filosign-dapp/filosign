import "@/lib/platform/polyfills/bigint-json";
import { warnIfSesMisconfigured } from "@/lib/platform/email/ses-config";

warnIfSesMisconfigured();

import {
	bootstrapPlatformRuntime,
	shutdownPlatformRuntime,
} from "@/lib/platform/bootstrap/platform-runtime";
import { assertWorkerRole } from "@/lib/platform/server-role";

assertWorkerRole();

let shuttingDown = false;

const bootstrapPromise = (async () => {
	try {
		await bootstrapPlatformRuntime({ crons: true, heartbeat: true });
	} catch (err) {
		console.error("Worker bootstrap failed:", err);
		process.exit(1);
	}
})();

void bootstrapPromise;

async function shutdown(): Promise<void> {
	if (shuttingDown) return;
	shuttingDown = true;
	await shutdownPlatformRuntime({ crons: true, heartbeat: true });
	// Sprint 5: await bullmqWorker.close() and drain in-flight jobs
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.on(signal, () => {
		void shutdown().finally(() =>
			process.exit(signal === "SIGINT" ? 130 : 143),
		);
	});
}
