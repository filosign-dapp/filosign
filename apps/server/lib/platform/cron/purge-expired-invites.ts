import { and, eq, isNull, lt } from "drizzle-orm";
import { PLATFORM_ALERT_EVENTS } from "@/lib/platform/analytics/events";
import { emitCriticalPlatformEvent } from "@/lib/platform/analytics/platform-alerts";
import db from "@/lib/platform/db";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import {
	CRON_LOCK_TTL,
	type CronHandle,
	registerLockedCron,
} from "./register-locked-cron";

/** Daily at 02:30 UTC — hard-delete long-expired unclaimed invites. */
export const PURGE_EXPIRED_INVITES_CRON = "30 2 * * *";
export const PURGE_EXPIRED_INVITES_RETENTION_DAYS = 90;

const { fileColdInvites, organizationInvites, userInvites } = db.schema;

function retentionCutoff(): Date {
	return new Date(
		Date.now() - PURGE_EXPIRED_INVITES_RETENTION_DAYS * 24 * 60 * 60 * 1000,
	);
}

export async function runPurgeExpiredInvitesJob(): Promise<{
	fileCold: number;
	org: number;
	user: number;
}> {
	const cutoff = retentionCutoff();

	const fileCold = await db
		.delete(fileColdInvites)
		.where(
			and(
				eq(fileColdInvites.status, "expired"),
				isNull(fileColdInvites.claimedAt),
				lt(fileColdInvites.updatedAt, cutoff),
			),
		)
		.returning({ id: fileColdInvites.id });

	const org = await db
		.delete(organizationInvites)
		.where(
			and(
				eq(organizationInvites.status, "expired"),
				isNull(organizationInvites.claimedAt),
				lt(organizationInvites.updatedAt, cutoff),
			),
		)
		.returning({ id: organizationInvites.id });

	const user = await db
		.delete(userInvites)
		.where(
			and(
				eq(userInvites.status, "expired"),
				isNull(userInvites.claimedAt),
				lt(userInvites.updatedAt, cutoff),
			),
		)
		.returning({ id: userInvites.id });

	return { fileCold: fileCold.length, org: org.length, user: user.length };
}

export async function runPurgeExpiredInvitesCronTick(): Promise<void> {
	const res = await tryCatch(runPurgeExpiredInvitesJob());
	if (res.error) {
		logger.error({ err: res.error }, "cron purge-expired-invites failed");
		void emitCriticalPlatformEvent({
			name: PLATFORM_ALERT_EVENTS.serverCronJobFailed,
			severity: "error",
			message: "Cron purge-expired-invites failed",
			context: {
				job: "purge-expired-invites",
				error:
					res.error instanceof Error ? res.error.message : String(res.error),
			},
		});
		return;
	}
	const total = res.data.fileCold + res.data.org + res.data.user;
	if (total > 0)
		logger.info({ ...res.data, total }, "cron purge-expired-invites");
}

export function registerPurgeExpiredInvitesCron(): CronHandle {
	return registerLockedCron({
		jobName: "purge-expired-invites",
		schedule: PURGE_EXPIRED_INVITES_CRON,
		bucketGranularity: "day",
		lockTtlSec: CRON_LOCK_TTL.daily,
		tick: runPurgeExpiredInvitesCronTick,
	});
}
