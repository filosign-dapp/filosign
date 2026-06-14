import { and, eq, gte, lt, sql } from "drizzle-orm";
import { emitBillingWebhookStuckAlert } from "@/lib/platform/analytics";
import db from "@/lib/platform/db";
import { billingWebhookEvents } from "@/lib/platform/db/schema/billing";
import { enqueueBillingWebhook } from "@/lib/platform/jobs";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { CRON_LOCK_TTL, type CronHandle, registerLockedCron } from "../utils";

export const BILLING_WEBHOOK_SWEEPER_CRON = "*/10 * * * *";
const RE_ENQUEUE_MIN_AGE_MS = 10 * 60 * 1000;
const ALERT_RECEIVED_MIN_AGE_MS = 15 * 60 * 1000;
const FAILED_ALERT_WINDOW_MS = 24 * 60 * 60 * 1000;
const SWEEP_BATCH_SIZE = 50;

export async function runBillingWebhookSweeperJob(): Promise<{
	reEnqueued: number;
	receivedCount: number;
	failedCount: number;
	oldestReceivedAgeMin: number | null;
}> {
	const reEnqueueBefore = new Date(Date.now() - RE_ENQUEUE_MIN_AGE_MS);
	const alertBefore = new Date(Date.now() - ALERT_RECEIVED_MIN_AGE_MS);

	const receivedRows = await db
		.select({
			providerEventId: billingWebhookEvents.providerEventId,
			createdAt: billingWebhookEvents.createdAt,
		})
		.from(billingWebhookEvents)
		.where(
			and(
				eq(billingWebhookEvents.status, "received"),
				lt(billingWebhookEvents.createdAt, reEnqueueBefore),
			),
		)
		.orderBy(billingWebhookEvents.createdAt)
		.limit(SWEEP_BATCH_SIZE);

	let reEnqueued = 0;
	for (const row of receivedRows) {
		try {
			await enqueueBillingWebhook(row.providerEventId);
			reEnqueued += 1;
		} catch (err) {
			logger.warn(
				{ providerEventId: row.providerEventId, err },
				"billing webhook sweeper re-enqueue failed",
			);
		}
	}

	const [receivedSummary] = await db
		.select({
			count: sql<number>`count(*)::int`,
			oldestCreatedAt: sql<Date | null>`min(${billingWebhookEvents.createdAt})`,
		})
		.from(billingWebhookEvents)
		.where(
			and(
				eq(billingWebhookEvents.status, "received"),
				lt(billingWebhookEvents.createdAt, alertBefore),
			),
		);

	const failedSince = new Date(Date.now() - FAILED_ALERT_WINDOW_MS);
	const [failedSummary] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(billingWebhookEvents)
		.where(
			and(
				eq(billingWebhookEvents.status, "failed"),
				gte(billingWebhookEvents.updatedAt, failedSince),
			),
		);

	const receivedCount = receivedSummary?.count ?? 0;
	const failedCount = failedSummary?.count ?? 0;
	const oldest = receivedSummary?.oldestCreatedAt;
	const oldestReceivedAgeMin =
		oldest != null
			? Math.round((Date.now() - oldest.getTime()) / 60_000)
			: null;

	if (receivedCount > 0 || failedCount > 0) {
		await emitBillingWebhookStuckAlert({
			receivedCount,
			failedCount,
			oldestReceivedAgeMin,
			reEnqueued,
		});
	}

	return {
		reEnqueued,
		receivedCount,
		failedCount,
		oldestReceivedAgeMin,
	};
}

export function registerBillingWebhookSweeperCron(): CronHandle {
	return registerLockedCron({
		jobName: "billing-webhook-sweeper",
		schedule: BILLING_WEBHOOK_SWEEPER_CRON,
		bucketGranularity: "hour",
		lockTtlSec: CRON_LOCK_TTL.hourly,
		tick: async () => {
			const res = await tryCatch(runBillingWebhookSweeperJob());
			if (res.error) {
				logger.error({ err: res.error }, "cron billing-webhook-sweeper failed");
			}
		},
	});
}
