import { and, inArray, lt } from "drizzle-orm";
import { expireAllPendingInvites } from "@/lib/domains/invites";
import { expirePartnerTrialsJob } from "@/lib/domains/platform-access";
import {
	emitCriticalPlatformEvent,
	PLATFORM_ALERT_EVENTS,
	SERVER_ANALYTICS_EVENTS,
	trackServerEvent,
} from "@/lib/platform/analytics";
import db from "@/lib/platform/db";
import { checkoutIntents } from "@/lib/platform/db/schema/platform-access";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { CRON_LOCK_TTL, type CronHandle, registerLockedCron } from "../utils";

// ==========================================
// 1. Expire Checkout Intents
// ==========================================

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

// ==========================================
// 2. Expire Invites
// ==========================================

export const EXPIRE_INVITES_CRON = "0 * * * *";

export async function runExpireInvitesJob(): Promise<{
	fileCold: number;
	org: number;
	user: number;
}> {
	const result = await expireAllPendingInvites();

	for (const row of result.fileCold.rows) {
		trackServerEvent({
			distinctId: "system",
			event: SERVER_ANALYTICS_EVENTS.coldInviteExpired,
			pieceCid: row.filePieceCid,
			properties: { invite_id: row.id },
		});
	}

	return {
		fileCold: result.fileCold.expiredCount,
		org: result.org.expiredCount,
		user: result.user.expiredCount,
	};
}

export async function runExpireInvitesCronTick(): Promise<void> {
	const res = await tryCatch(runExpireInvitesJob());
	if (res.error) {
		logger.error({ err: res.error }, "cron expire-invites failed");
		void emitCriticalPlatformEvent({
			name: PLATFORM_ALERT_EVENTS.serverCronJobFailed,
			severity: "error",
			message: "Cron expire-invites failed",
			context: {
				job: "expire-invites",
				error:
					res.error instanceof Error ? res.error.message : String(res.error),
			},
		});
		return;
	}
	const { fileCold, org, user } = res.data;
	const total = fileCold + org + user;
	if (total > 0) {
		logger.info({ fileCold, org, user, total }, "cron expire-invites");
	}
}

export function registerExpireInvitesCron(): CronHandle {
	return registerLockedCron({
		jobName: "expire-invites",
		schedule: EXPIRE_INVITES_CRON,
		bucketGranularity: "hour",
		lockTtlSec: CRON_LOCK_TTL.hourly,
		tick: runExpireInvitesCronTick,
	});
}

// ==========================================
// 3. Expire Partner Trials
// ==========================================

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
