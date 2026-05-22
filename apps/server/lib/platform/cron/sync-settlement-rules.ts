import { runSyncSettlementRulesJob } from "@/lib/domains/settlements";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

/** Daily — sync on-chain `executed` into DB for off-platform or missed payouts. */
export const SYNC_SETTLEMENT_RULES_CRON = "0 0 * * *";

export { runSyncSettlementRulesJob } from "@/lib/domains/settlements";

type CronHandle = { stop(): void };

export function registerSyncSettlementRulesCron(): CronHandle {
	return Bun.cron(SYNC_SETTLEMENT_RULES_CRON, async () => {
		const res = await tryCatch(runSyncSettlementRulesJob());
		if (res.error) {
			logger.error({ err: res.error }, "cron sync-settlement-rules failed");
			return;
		}
		if (res.data.synced > 0) {
			logger.info(res.data, "cron sync-settlement-rules");
		}
	}) as CronHandle;
}
