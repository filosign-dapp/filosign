import { parseEther } from "viem";
import env from "@/env";
import { PLATFORM_ALERT_EVENTS } from "@/lib/platform/analytics/events";
import { emitCriticalPlatformEvent } from "@/lib/platform/analytics/platform-alerts";
import { evmClient } from "@/lib/platform/evm";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import {
	CRON_LOCK_TTL,
	type CronHandle,
	registerLockedCron,
} from "./register-locked-cron";

/** Every hour at :30 UTC — alert when KMS relayer ETH is low on paid deployments. */
export const MONITOR_RELAYER_GAS_CRON = "30 * * * *";

/** Minimum native balance before critical alert (mainnet/staging). */
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

export async function runMonitorRelayerGasCronTick(): Promise<void> {
	const res = await tryCatch(runMonitorRelayerGasJob());
	if (res.error) {
		logger.error({ err: res.error }, "cron monitor-relayer-gas failed");
		void emitCriticalPlatformEvent({
			name: PLATFORM_ALERT_EVENTS.serverCronJobFailed,
			severity: "error",
			message: "Cron monitor-relayer-gas failed",
			context: {
				job: "monitor-relayer-gas",
				error:
					res.error instanceof Error ? res.error.message : String(res.error),
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
