import { registerPurgeLapsedArchivalCron } from "./tasks/archival";
import { registerBillingWebhookSweeperCron } from "./tasks/billing-webhooks";
import {
	registerExpireCheckoutIntentsCron,
	registerExpireInvitesCron,
	registerExpirePartnerTrialsCron,
} from "./tasks/expiry";
import { registerFocTransitionCron } from "./tasks/foc";
import {
	registerOutboxPruneCron,
	registerOutboxSweeperCron,
} from "./tasks/outbox";
import {
	registerOrphanUploadSweeperCron,
	registerPurgeArchivedDraftsCron,
	registerPurgeExpiredInvitesCron,
	registerPurgeSentDraftBlobsCron,
} from "./tasks/purge";
import {
	registerRedactAccessRequestPiiCron,
	registerRedactComplianceMetadataCron,
} from "./tasks/redact";
import {
	registerMonitorRelayerGasCron,
	registerSyncAttachmentReleasesCron,
	registerSyncSettlementRulesCron,
} from "./tasks/sync";
import type { CronHandle } from "./utils";

export {
	PURGE_LAPSED_ARCHIVAL_CRON,
	runPurgeLapsedArchivalJob,
} from "./tasks/archival";
export {
	EXPIRE_CHECKOUT_INTENTS_CRON,
	EXPIRE_INVITES_CRON,
	EXPIRE_PARTNER_TRIALS_CRON,
	runExpireCheckoutIntentsCronTick,
	runExpireCheckoutIntentsJob,
	runExpireInvitesCronTick,
	runExpireInvitesJob,
	runExpirePartnerTrialsCronTick,
} from "./tasks/expiry";
export {
	OUTBOX_PROCESSED_RETENTION_DAYS,
	OUTBOX_PRUNE_CRON,
	OUTBOX_SWEEPER_CRON,
	OUTBOX_SWEEPER_MIN_AGE_MS,
	runOutboxPruneJob,
	runOutboxSweeperJob,
} from "./tasks/outbox";
export {
	ORPHAN_UPLOAD_MIN_AGE_MS,
	ORPHAN_UPLOAD_SWEEPER_CRON,
	PURGE_ARCHIVED_DRAFTS_CRON,
	PURGE_ARCHIVED_DRAFTS_RETENTION_DAYS,
	PURGE_EXPIRED_INVITES_CRON,
	PURGE_EXPIRED_INVITES_RETENTION_DAYS,
	PURGE_SENT_DRAFT_BLOBS_CRON,
	registerOrphanUploadSweeperCron,
	runOrphanUploadSweeperJob,
	runPurgeArchivedDraftsCronTick,
	runPurgeArchivedDraftsJob,
	runPurgeExpiredInvitesCronTick,
	runPurgeExpiredInvitesJob,
	runPurgeSentDraftBlobsJob,
	runPurgeSentDraftBlobsJobTick as runPurgeSentDraftBlobsCronTick,
	SENT_DRAFT_BLOB_RETENTION_DAYS,
} from "./tasks/purge";
export {
	ACCESS_REQUEST_PII_RETENTION_DAYS,
	COMPLIANCE_METADATA_RETENTION_DAYS,
	REDACT_ACCESS_REQUEST_PII_CRON,
	REDACT_COMPLIANCE_METADATA_CRON,
	runRedactAccessRequestPiiCronTick,
	runRedactAccessRequestPiiJob,
	runRedactComplianceMetadataCronTick,
	runRedactComplianceMetadataJob,
} from "./tasks/redact";

export {
	MONITOR_RELAYER_GAS_CRON,
	RELAYER_GAS_ALERT_THRESHOLD_WEI,
	relayerGasMonitoringEnabled,
	runMonitorFocWalletBalancesJob,
	runMonitorRelayerGasCronTick,
	runMonitorRelayerGasJob,
	runSyncAttachmentReleasesCronTick,
	runSyncSettlementRulesCronTick,
	runSyncSettlementRulesJob,
	SYNC_ATTACHMENT_RELEASES_CRON,
	SYNC_SETTLEMENT_RULES_CRON,
} from "./tasks/sync";
export {
	CRON_LOCK_TTL,
	type CronBucketGranularity,
	type CronHandle,
	cronBucketForSchedule,
	cronLockKey,
	formatCronBucket,
	formatDayBucket,
	formatHourBucket,
	registerLockedCron,
	resolveScheduledFireMs,
	withCronLock,
} from "./utils";

export type PlatformCronJob = CronHandle;

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
	activeJobs.push(registerBillingWebhookSweeperCron());
	activeJobs.push(registerOrphanUploadSweeperCron());
	activeJobs.push(registerPurgeArchivedDraftsCron());
	activeJobs.push(registerPurgeExpiredInvitesCron());
	activeJobs.push(registerPurgeSentDraftBlobsCron());
	activeJobs.push(registerRedactAccessRequestPiiCron());
	activeJobs.push(registerRedactComplianceMetadataCron());
	activeJobs.push(registerPurgeLapsedArchivalCron());
	activeJobs.push(registerFocTransitionCron());
}

export function stopPlatformCron(): void {
	for (const job of activeJobs) {
		job.stop();
	}
	activeJobs.length = 0;
}
