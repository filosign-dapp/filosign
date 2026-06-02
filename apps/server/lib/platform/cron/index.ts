import { registerExpireCheckoutIntentsCron } from "./expire-checkout-intents";
import { registerExpireInvitesCron } from "./expire-invites";
import { registerExpirePartnerTrialsCron } from "./expire-partner-trials";
import { registerMonitorRelayerGasCron } from "./monitor-relayer-gas";
import { registerOrphanUploadSweeperCron } from "./orphan-upload-sweeper";
import { registerOutboxPruneCron } from "./outbox-prune";
import { registerOutboxSweeperCron } from "./outbox-sweeper";
import { registerPurgeArchivedDraftsCron } from "./purge-archived-drafts";
import { registerPurgeExpiredInvitesCron } from "./purge-expired-invites";
import { registerPurgeSentDraftBlobsCron } from "./purge-sent-draft-blobs";
import { registerRedactAccessRequestPiiCron } from "./redact-access-request-pii";
import { registerRedactComplianceMetadataCron } from "./redact-compliance-metadata";
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
	PURGE_ARCHIVED_DRAFTS_CRON,
	PURGE_ARCHIVED_DRAFTS_RETENTION_DAYS,
	runPurgeArchivedDraftsJob,
} from "./purge-archived-drafts";
export {
	PURGE_EXPIRED_INVITES_CRON,
	PURGE_EXPIRED_INVITES_RETENTION_DAYS,
	runPurgeExpiredInvitesJob,
} from "./purge-expired-invites";
export {
	PURGE_SENT_DRAFT_BLOBS_CRON,
	runPurgeSentDraftBlobsJob,
	SENT_DRAFT_BLOB_RETENTION_DAYS,
} from "./purge-sent-draft-blobs";
export {
	ACCESS_REQUEST_PII_RETENTION_DAYS,
	REDACT_ACCESS_REQUEST_PII_CRON,
	runRedactAccessRequestPiiJob,
} from "./redact-access-request-pii";
export {
	COMPLIANCE_METADATA_RETENTION_DAYS,
	REDACT_COMPLIANCE_METADATA_CRON,
	runRedactComplianceMetadataJob,
} from "./redact-compliance-metadata";
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
	activeJobs.push(registerPurgeArchivedDraftsCron());
	activeJobs.push(registerPurgeExpiredInvitesCron());
	activeJobs.push(registerPurgeSentDraftBlobsCron());
	activeJobs.push(registerRedactAccessRequestPiiCron());
	activeJobs.push(registerRedactComplianceMetadataCron());
}

export function stopPlatformCron(): void {
	for (const job of activeJobs) {
		job.stop();
	}
	activeJobs.length = 0;
}
