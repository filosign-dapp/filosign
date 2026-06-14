import { parseEther } from "viem";
import env from "@/env";
import { runSyncAttachmentReleasesJob } from "@/lib/domains/attachments";
import { runSyncSettlementRulesJob } from "@/lib/domains/settlements";
import {
	emitCriticalPlatformEvent,
	PLATFORM_ALERT_EVENTS,
} from "@/lib/platform/analytics";
import { evmClient } from "@/lib/platform/evm";
import {
	FOC_FIL_ALERT_THRESHOLD_WEI,
	FOC_USDFC_ALERT_THRESHOLD_WEI,
	readFocWalletBalances,
} from "@/lib/platform/foc/wallet-balances";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { CRON_LOCK_TTL, type CronHandle, registerLockedCron } from "../utils";

export { runSyncSettlementRulesJob } from "@/lib/domains/settlements";

// ==========================================
// 1. Sync Attachment Releases
// ==========================================

export const SYNC_ATTACHMENT_RELEASES_CRON = "15 0 * * *";

export async function runSyncAttachmentReleasesCronTick(): Promise<void> {
	const res = await tryCatch(runSyncAttachmentReleasesJob());
	if (res.error) {
		logger.error({ err: res.error }, "cron sync-attachment-releases failed");
		void emitCriticalPlatformEvent({
			name: PLATFORM_ALERT_EVENTS.serverCronJobFailed,
			severity: "error",
			message: "Cron sync-attachment-releases failed",
			context: {
				job: "sync-attachment-releases",
				error:
					res.error instanceof Error ? res.error.message : String(res.error),
			},
		});
		return;
	}
	if (res.data.released > 0) {
		logger.info(res.data, "cron sync-attachment-releases");
	}
}

export function registerSyncAttachmentReleasesCron(): CronHandle {
	return registerLockedCron({
		jobName: "sync-attachment-releases",
		schedule: SYNC_ATTACHMENT_RELEASES_CRON,
		bucketGranularity: "day",
		lockTtlSec: CRON_LOCK_TTL.daily,
		tick: runSyncAttachmentReleasesCronTick,
	});
}

// ==========================================
// 2. Sync Settlement Rules
// ==========================================

export const SYNC_SETTLEMENT_RULES_CRON = "0 0 * * *";

export async function runSyncSettlementRulesCronTick(): Promise<void> {
	const res = await tryCatch(runSyncSettlementRulesJob());
	if (res.error) {
		logger.error({ err: res.error }, "cron sync-settlement-rules failed");
		void emitCriticalPlatformEvent({
			name: PLATFORM_ALERT_EVENTS.serverCronJobFailed,
			severity: "error",
			message: "Cron sync-settlement-rules failed",
			context: {
				job: "sync-settlement-rules",
				error:
					res.error instanceof Error ? res.error.message : String(res.error),
			},
		});
		return;
	}
	if (res.data.synced > 0) {
		logger.info(res.data, "cron sync-settlement-rules");
	}
}

export function registerSyncSettlementRulesCron(): CronHandle {
	return registerLockedCron({
		jobName: "sync-settlement-rules",
		schedule: SYNC_SETTLEMENT_RULES_CRON,
		bucketGranularity: "day",
		lockTtlSec: CRON_LOCK_TTL.daily,
		tick: runSyncSettlementRulesCronTick,
	});
}

// ==========================================
// 3. Monitor relayer gas + FOC wallet balances
// ==========================================

export const MONITOR_RELAYER_GAS_CRON = "30 * * * *";
export const RELAYER_GAS_ALERT_THRESHOLD_WEI = parseEther("0.02");

export function relayerGasMonitoringEnabled(): boolean {
	return env.DEPLOYMENT === "staging" || env.DEPLOYMENT === "production";
}

export async function runMonitorRelayerGasJob(): Promise<{
	checked: boolean;
	balanceWei: bigint;
	thresholdWei: bigint;
	alerted: boolean;
}> {
	const thresholdWei = RELAYER_GAS_ALERT_THRESHOLD_WEI;

	if (!relayerGasMonitoringEnabled()) {
		return {
			checked: false,
			balanceWei: 0n,
			thresholdWei,
			alerted: false,
		};
	}

	const balanceRes = await tryCatch(
		evmClient.getBalance({ address: env.FC_SERVER_ADDRESS }),
	);
	if (balanceRes.error) {
		throw balanceRes.error;
	}

	const balanceWei = balanceRes.data;
	if (balanceWei >= thresholdWei) {
		return { checked: true, balanceWei, thresholdWei, alerted: false };
	}

	void emitCriticalPlatformEvent({
		name: PLATFORM_ALERT_EVENTS.serverRelayerGasLow,
		severity: "critical",
		message: "KMS relayer native balance below threshold",
		context: {
			wallet: env.FC_SERVER_ADDRESS,
			balanceWei: balanceWei.toString(),
			thresholdWei: thresholdWei.toString(),
			deployment: env.DEPLOYMENT,
			chain: env.CHAIN,
		},
	});

	logger.warn(
		{
			wallet: env.FC_SERVER_ADDRESS,
			balanceWei: balanceWei.toString(),
			thresholdWei: thresholdWei.toString(),
		},
		"relayer gas below threshold",
	);

	return { checked: true, balanceWei, thresholdWei, alerted: true };
}

export async function runMonitorFocWalletBalancesJob(): Promise<{
	checked: boolean;
	filBalanceWei: bigint;
	filThresholdWei: bigint;
	filAlerted: boolean;
	usdfcBalanceWei: bigint;
	usdfcThresholdWei: bigint;
	usdfcAlerted: boolean;
}> {
	const filThresholdWei = FOC_FIL_ALERT_THRESHOLD_WEI;
	const usdfcThresholdWei = FOC_USDFC_ALERT_THRESHOLD_WEI;

	if (!relayerGasMonitoringEnabled()) {
		return {
			checked: false,
			filBalanceWei: 0n,
			filThresholdWei,
			filAlerted: false,
			usdfcBalanceWei: 0n,
			usdfcThresholdWei,
			usdfcAlerted: false,
		};
	}

	const balanceRes = await tryCatch(
		readFocWalletBalances(env.FC_SERVER_ADDRESS),
	);
	if (balanceRes.error) {
		throw balanceRes.error;
	}

	const { filBalanceWei, usdfcBalanceWei } = balanceRes.data;
	let filAlerted = false;
	let usdfcAlerted = false;

	if (filBalanceWei < filThresholdWei) {
		filAlerted = true;
		void emitCriticalPlatformEvent({
			name: PLATFORM_ALERT_EVENTS.serverFocFilLow,
			severity: "critical",
			message: "FOC wallet FIL balance below threshold",
			context: {
				wallet: env.FC_SERVER_ADDRESS,
				balanceWei: filBalanceWei.toString(),
				thresholdWei: filThresholdWei.toString(),
				deployment: env.DEPLOYMENT,
				chain: env.CHAIN,
				token: "FIL",
			},
		});
		logger.warn(
			{
				wallet: env.FC_SERVER_ADDRESS,
				balanceWei: filBalanceWei.toString(),
				thresholdWei: filThresholdWei.toString(),
			},
			"FOC wallet FIL below threshold",
		);
	}

	if (usdfcBalanceWei < usdfcThresholdWei) {
		usdfcAlerted = true;
		void emitCriticalPlatformEvent({
			name: PLATFORM_ALERT_EVENTS.serverFocUsdfcLow,
			severity: "critical",
			message: "FOC wallet USDFC balance below threshold",
			context: {
				wallet: env.FC_SERVER_ADDRESS,
				balanceWei: usdfcBalanceWei.toString(),
				thresholdWei: usdfcThresholdWei.toString(),
				deployment: env.DEPLOYMENT,
				chain: env.CHAIN,
				token: "USDFC",
			},
		});
		logger.warn(
			{
				wallet: env.FC_SERVER_ADDRESS,
				balanceWei: usdfcBalanceWei.toString(),
				thresholdWei: usdfcThresholdWei.toString(),
			},
			"FOC wallet USDFC below threshold",
		);
	}

	return {
		checked: true,
		filBalanceWei,
		filThresholdWei,
		filAlerted,
		usdfcBalanceWei,
		usdfcThresholdWei,
		usdfcAlerted,
	};
}

export async function runMonitorRelayerGasCronTick(): Promise<void> {
	const gasRes = await tryCatch(runMonitorRelayerGasJob());
	if (gasRes.error) {
		logger.error({ err: gasRes.error }, "cron monitor-relayer-gas failed");
		void emitCriticalPlatformEvent({
			name: PLATFORM_ALERT_EVENTS.serverCronJobFailed,
			severity: "error",
			message: "Cron monitor-relayer-gas failed",
			context: {
				job: "monitor-relayer-gas",
				error:
					gasRes.error instanceof Error
						? gasRes.error.message
						: String(gasRes.error),
			},
		});
	}

	const focRes = await tryCatch(runMonitorFocWalletBalancesJob());
	if (focRes.error) {
		logger.error(
			{ err: focRes.error },
			"cron monitor-foc-wallet-balances failed",
		);
		void emitCriticalPlatformEvent({
			name: PLATFORM_ALERT_EVENTS.serverCronJobFailed,
			severity: "error",
			message: "Cron monitor-foc-wallet-balances failed",
			context: {
				job: "monitor-foc-wallet-balances",
				error:
					focRes.error instanceof Error
						? focRes.error.message
						: String(focRes.error),
			},
		});
	}
}

export function registerMonitorRelayerGasCron(): CronHandle {
	return registerLockedCron({
		jobName: "monitor-relayer-gas",
		schedule: MONITOR_RELAYER_GAS_CRON,
		bucketGranularity: "hour",
		lockTtlSec: CRON_LOCK_TTL.hourly,
		tick: runMonitorRelayerGasCronTick,
	});
}
