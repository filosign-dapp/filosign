import { registerExpireCheckoutIntentsCron } from "./expire-checkout-intents";
import { registerExpireInvitesCron } from "./expire-invites";
import { registerExpirePartnerTrialsCron } from "./expire-partner-trials";
import { registerMonitorRelayerGasCron } from "./monitor-relayer-gas";
import { registerOrphanUploadSweeperCron } from "./orphan-upload-sweeper";
import { registerOutboxPruneCron } from "./outbox-prune";
import { registerOutboxSweeperCron } from "./outbox-sweeper";
import { registerSyncAttachmentReleasesCron } from "./sync-attachment-releases";
import { registerSyncSettlementRulesCron } from "./sync-settlement-rules";

export {
	type CronBucketGranularity,
	cronBucketForSchedule,
	formatCronBucket,
	formatDayBucket,
	formatHourBucket,
	resolveScheduledFireMs,
} from "./cron-bucket";
export {
	EXPIRE_CHECKOUT_INTENTS_CRON,
	runExpireCheckoutIntentsJob,
} from "./expire-checkout-intents";
export {
	EXPIRE_INVITES_CRON,
	runExpireInvitesJob,
} from "./expire-invites";
export {
	EXPIRE_PARTNER_TRIALS_CRON,
	runExpirePartnerTrialsCronTick,
} from "./expire-partner-trials";
export {
	MONITOR_RELAYER_GAS_CRON,
	RELAYER_GAS_ALERT_THRESHOLD_WEI,
	runMonitorRelayerGasJob,
} from "./monitor-relayer-gas";
export {
	ORPHAN_UPLOAD_MIN_AGE_MS,
	ORPHAN_UPLOAD_SWEEPER_CRON,
	runOrphanUploadSweeperJob,
} from "./orphan-upload-sweeper";
export {
	OUTBOX_PROCESSED_RETENTION_DAYS,
	OUTBOX_PRUNE_CRON,
	runOutboxPruneJob,
} from "./outbox-prune";
export {
	OUTBOX_SWEEPER_CRON,
	OUTBOX_SWEEPER_MIN_AGE_MS,
	runOutboxSweeperJob,
} from "./outbox-sweeper";
export {
	CRON_LOCK_TTL,
	type CronHandle,
	registerLockedCron,
} from "./register-locked-cron";
export {
	runSyncAttachmentReleasesCronTick,
	SYNC_ATTACHMENT_RELEASES_CRON,
} from "./sync-attachment-releases";
export {
	runSyncSettlementRulesJob,
	SYNC_SETTLEMENT_RULES_CRON,
} from "./sync-settlement-rules";
export { cronLockKey, withCronLock } from "./with-cron-lock";

/** Bun.cron — universal 7-day invite expiry (document, user, org). */
export type PlatformCronJob = import("./register-locked-cron").CronHandle;

const activeJobs: PlatformCronJob[] = [];

export function startPlatformCron(): void {
	if (activeJobs.length > 0) return;
	activeJobs.push(registerExpireInvitesCron());
	activeJobs.push(registerExpireCheckoutIntentsCron());
	activeJobs.push(registerExpirePartnerTrialsCron());
	activeJobs.push(registerSyncSettlementRulesCron());
	activeJobs.push(registerSyncAttachmentReleasesCron());
	activeJobs.push(registerMonitorRelayerGasCron());
	activeJobs.push(registerOutboxSweeperCron());
	activeJobs.push(registerOutboxPruneCron());
	activeJobs.push(registerOrphanUploadSweeperCron());
}

export function stopPlatformCron(): void {
	for (const job of activeJobs) {
		job.stop();
	}
	activeJobs.length = 0;
}
