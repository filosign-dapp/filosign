import { purgeLapsedOrgArchival } from "@/lib/domains/archival";
import { logger } from "@/lib/platform/pino";
import { CRON_LOCK_TTL, type CronHandle, registerLockedCron } from "../utils";

export const PURGE_LAPSED_ARCHIVAL_CRON = "0 4 * * *";

export async function runPurgeLapsedArchivalJob() {
	const count = await purgeLapsedOrgArchival();
	if (count > 0) {
		logger.info({ count }, "purge-lapsed-archival completed");
	}
}

export async function runPurgeLapsedArchivalCronTick() {
	await runPurgeLapsedArchivalJob();
}

export function registerPurgeLapsedArchivalCron(): CronHandle {
	return registerLockedCron({
		jobName: "purge-lapsed-archival",
		schedule: PURGE_LAPSED_ARCHIVAL_CRON,
		bucketGranularity: "day",
		lockTtlSec: CRON_LOCK_TTL.daily,
		tick: runPurgeLapsedArchivalCronTick,
	});
}
