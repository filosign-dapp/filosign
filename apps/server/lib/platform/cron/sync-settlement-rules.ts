import { runSyncSettlementRulesJob } from "@/lib/domains/settlements";
import { PLATFORM_ALERT_EVENTS } from "@/lib/platform/analytics/events";
import { emitCriticalPlatformEvent } from "@/lib/platform/analytics/platform-alerts";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

/** Daily — sync on-chain `executed` into DB for off-platform or missed payouts. */
export const SYNC_SETTLEMENT_RULES_CRON = "0 0 * * *";

export { runSyncSettlementRulesJob } from "@/lib/domains/settlements";

type CronHandle = { stop(): void };

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
	return Bun.cron(SYNC_SETTLEMENT_RULES_CRON, () =>
		runSyncSettlementRulesCronTick(),
	) as CronHandle;
}
