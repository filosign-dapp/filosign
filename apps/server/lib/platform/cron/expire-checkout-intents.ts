import { and, inArray, lt } from "drizzle-orm";
import { PLATFORM_ALERT_EVENTS } from "@/lib/platform/analytics/events";
import { emitCriticalPlatformEvent } from "@/lib/platform/analytics/platform-alerts";
import db from "@/lib/platform/db";
import { checkoutIntents } from "@/lib/platform/db/schema/platform-access";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import {
	CRON_LOCK_TTL,
	type CronHandle,
	registerLockedCron,
} from "./register-locked-cron";

/** Every hour at :15 UTC — expire abandoned marketing checkout intents. */
export const EXPIRE_CHECKOUT_INTENTS_CRON = "15 * * * *";

export async function runExpireCheckoutIntentsJob(): Promise<{
	expired: number;
}> {
	const now = new Date();
	const rows = await db
		.update(checkoutIntents)
		.set({ status: "expired", updatedAt: now })
		.where(
			and(
				lt(checkoutIntents.expiresAt, now),
				inArray(checkoutIntents.status, ["pending", "checkout_open"]),
			),
		)
		.returning({ id: checkoutIntents.id });

	return { expired: rows.length };
}

export async function runExpireCheckoutIntentsCronTick(): Promise<void> {
	const res = await tryCatch(runExpireCheckoutIntentsJob());
	if (res.error) {
		logger.error({ err: res.error }, "cron expire-checkout-intents failed");
		void emitCriticalPlatformEvent({
			name: PLATFORM_ALERT_EVENTS.serverCronJobFailed,
			severity: "error",
			message: "Cron expire-checkout-intents failed",
			context: {
				job: "expire-checkout-intents",
				error:
					res.error instanceof Error ? res.error.message : String(res.error),
			},
		});
		return;
	}
	if (res.data.expired > 0) {
		logger.info({ expired: res.data.expired }, "cron expire-checkout-intents");
	}
}

export function registerExpireCheckoutIntentsCron(): CronHandle {
	return registerLockedCron({
		jobName: "expire-checkout-intents",
		schedule: EXPIRE_CHECKOUT_INTENTS_CRON,
		bucketGranularity: "hour",
		lockTtlSec: CRON_LOCK_TTL.hourly,
		tick: runExpireCheckoutIntentsCronTick,
	});
}
