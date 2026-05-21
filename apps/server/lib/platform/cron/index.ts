import { registerExpireInvitesCron } from "./expire-invites";
import { registerSyncPaymentRulesCron } from "./sync-payment-rules";

export {
	EXPIRE_INVITES_CRON,
	runExpireInvitesJob,
} from "./expire-invites";

export {
	runSyncPaymentRulesJob,
	SYNC_PAYMENT_RULES_CRON,
} from "./sync-payment-rules";

/** Bun.cron — universal 7-day invite expiry (document, user, org). */
export type PlatformCronJob = { stop(): void };

const activeJobs: PlatformCronJob[] = [];

export function startPlatformCron(): void {
	if (activeJobs.length > 0) return;
	activeJobs.push(registerExpireInvitesCron());
	activeJobs.push(registerSyncPaymentRulesCron());
}

export function stopPlatformCron(): void {
	for (const job of activeJobs) {
		job.stop();
	}
	activeJobs.length = 0;
}
