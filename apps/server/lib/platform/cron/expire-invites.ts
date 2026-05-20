import { expireAllPendingInvites } from "@/lib/domains/invites";
import { SERVER_ANALYTICS_EVENTS } from "@/lib/platform/analytics/events";
import { trackServerEvent } from "@/lib/platform/analytics/track";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

/** Every hour at :00 UTC — expire document, user, and org invites past `expiresAt`. */
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

type CronHandle = { stop(): void };

export function registerExpireInvitesCron(): CronHandle {
	return Bun.cron(EXPIRE_INVITES_CRON, async () => {
		const res = await tryCatch(runExpireInvitesJob());
		if (res.error) {
			logger.error({ err: res.error }, "cron expire-invites failed");
			return;
		}
		const { fileCold, org, user } = res.data;
		const total = fileCold + org + user;
		if (total > 0) {
			logger.info({ fileCold, org, user, total }, "cron expire-invites");
		}
	}) as CronHandle;
}
