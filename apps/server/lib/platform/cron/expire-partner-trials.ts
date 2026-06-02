import { expirePartnerTrialsJob } from "@/lib/domains/platform-access";
import { PLATFORM_ALERT_EVENTS } from "@/lib/platform/analytics/events";
import { emitCriticalPlatformEvent } from "@/lib/platform/analytics/platform-alerts";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import {
	CRON_LOCK_TTL,
	type CronHandle,
	registerLockedCron,
} from "./register-locked-cron";

/** Daily — expire partner trial subscriptions past periodEnd. */
export const EXPIRE_PARTNER_TRIALS_CRON = "15 0 * * *";

export async function runExpirePartnerTrialsCronTick(): Promise<void> {
	const res = await tryCatch(expirePartnerTrialsJob());
	if (res.error) {
		logger.error({ err: res.error }, "cron expire-partner-trials failed");
		void emitCriticalPlatformEvent({
			name: PLATFORM_ALERT_EVENTS.serverCronJobFailed,
			severity: "error",
			message: "Cron expire-partner-trials failed",
			context: {
				job: "expire-partner-trials",
				error:
					res.error instanceof Error ? res.error.message : String(res.error),
			},
		});
		return;
	}
	if (res.data.expired > 0) {
		logger.info(res.data, "cron expire-partner-trials");
	}
}

export function registerExpirePartnerTrialsCron(): CronHandle {
	return registerLockedCron({
		jobName: "expire-partner-trials",
		schedule: EXPIRE_PARTNER_TRIALS_CRON,
		bucketGranularity: "day",
		lockTtlSec: CRON_LOCK_TTL.daily,
		tick: runExpirePartnerTrialsCronTick,
	});
}
