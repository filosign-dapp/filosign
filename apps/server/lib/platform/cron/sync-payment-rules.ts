import { runSyncPaymentRulesJob } from "@/lib/domains/payments";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

/** Hourly — mark rules `ready` when on-chain `canExecute` is true. */
export const SYNC_PAYMENT_RULES_CRON = "0 * * * *";

export { runSyncPaymentRulesJob } from "@/lib/domains/payments";

type CronHandle = { stop(): void };

export function registerSyncPaymentRulesCron(): CronHandle {
	return Bun.cron(SYNC_PAYMENT_RULES_CRON, async () => {
		const res = await tryCatch(runSyncPaymentRulesJob());
		if (res.error) {
			logger.error({ err: res.error }, "cron sync-payment-rules failed");
			return;
		}
		if (res.data.markedReady > 0) {
			logger.info(res.data, "cron sync-payment-rules");
		}
	}) as CronHandle;
}
