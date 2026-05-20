import { registerExpireInvitesCron } from "./expire-invites";

export {
	EXPIRE_INVITES_CRON,
	runExpireInvitesJob,
} from "./expire-invites";

/** Bun.cron — universal 7-day invite expiry (document, user, org). */
export type PlatformCronJob = { stop(): void };

const activeJobs: PlatformCronJob[] = [];

export function startPlatformCron(): void {
	if (activeJobs.length > 0) return;
	activeJobs.push(registerExpireInvitesCron());
}

export function stopPlatformCron(): void {
	for (const job of activeJobs) {
		job.stop();
	}
	activeJobs.length = 0;
}
