import { registerExpireInvitesCron } from "./expire-invites";
import { registerMonitorRelayerGasCron } from "./monitor-relayer-gas";
import { registerSyncSettlementRulesCron } from "./sync-settlement-rules";

export {
	EXPIRE_INVITES_CRON,
	runExpireInvitesJob,
} from "./expire-invites";
export {
	MONITOR_RELAYER_GAS_CRON,
	RELAYER_GAS_ALERT_THRESHOLD_WEI,
	runMonitorRelayerGasJob,
} from "./monitor-relayer-gas";
export {
	runSyncSettlementRulesJob,
	SYNC_SETTLEMENT_RULES_CRON,
} from "./sync-settlement-rules";

/** Bun.cron — universal 7-day invite expiry (document, user, org). */
export type PlatformCronJob = { stop(): void };

const activeJobs: PlatformCronJob[] = [];

export function startPlatformCron(): void {
	if (activeJobs.length > 0) return;
	activeJobs.push(registerExpireInvitesCron());
	activeJobs.push(registerSyncSettlementRulesCron());
	activeJobs.push(registerMonitorRelayerGasCron());
}

export function stopPlatformCron(): void {
	for (const job of activeJobs) {
		job.stop();
	}
	activeJobs.length = 0;
}
