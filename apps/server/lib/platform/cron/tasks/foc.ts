import { listFocTransitionsDue } from "@/lib/domains/foc";
import { enqueueFocTransition } from "@/lib/platform/jobs";
import { logger } from "@/lib/platform/pino";
import { CRON_LOCK_TTL, type CronHandle, registerLockedCron } from "../utils";

export const FOC_TRANSITION_CRON = "15 */6 * * *";

export async function runFocTransitionCronJob(): Promise<{ enqueued: number }> {
	const pieceCids = await listFocTransitionsDue(100);
	let enqueued = 0;

	for (const pieceCid of pieceCids) {
		await enqueueFocTransition(pieceCid);
		enqueued += 1;
	}

	if (enqueued > 0) {
		logger.info({ enqueued }, "foc-transition cron: enqueued due transitions");
	}

	return { enqueued };
}

export async function runFocTransitionCronTick(): Promise<void> {
	await runFocTransitionCronJob();
}

export function registerFocTransitionCron(): CronHandle {
	return registerLockedCron({
		jobName: "foc-transition",
		schedule: FOC_TRANSITION_CRON,
		bucketGranularity: "hour",
		lockTtlSec: CRON_LOCK_TTL.hourly,
		tick: runFocTransitionCronTick,
	});
}
