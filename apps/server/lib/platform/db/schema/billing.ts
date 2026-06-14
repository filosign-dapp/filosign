import type { FeatureKey } from "@filosign/entitlements";
import { PLAN_IDS } from "@filosign/entitlements";
import * as t from "drizzle-orm/pg-core";
import { timestamps } from "@/lib/platform/db/helpers";
import { randomUuidV7 } from "@/lib/platform/db/random-uuid-v7";

/** Mirrors `@filosign/entitlements` `PlanId` - stored on subscription rows only. */
export const subscriptionPlanIds = PLAN_IDS;

export type SubscriptionPlanId = (typeof subscriptionPlanIds)[number];

export const subscriptionStatuses = [
	"active",
	"trialing",
	"past_due",
	"canceled",
	"incomplete",
] as const;

export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

export const subscriptionProviders = ["manual", "dodo"] as const;

export type SubscriptionProvider = (typeof subscriptionProviders)[number];

export const billingWebhookEventStatuses = [
	"received",
	"processed",
	"failed",
] as const;

export type BillingWebhookEventStatus =
	(typeof billingWebhookEventStatuses)[number];

export type SubscriptionFeatureOverrides = Partial<
	Record<FeatureKey, number | boolean>
>;

/**
 * Dodo webhook delivery log for idempotency and replay-safe processing.
 */
export const billingWebhookEvents = t.pgTable(
	"billing_webhook_events",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		provider: t.text({ enum: subscriptionProviders }).notNull().default("dodo"),
		providerEventId: t.text().notNull().unique(),
		eventType: t.text().notNull(),
		status: t
			.text({ enum: billingWebhookEventStatuses })
			.notNull()
			.default("processed"),
		deliveryTimestamp: t.timestamp({ withTimezone: true }),
		processedAt: t.timestamp({ withTimezone: true }),
		lastError: t.text(),
		payloadJson: t.jsonb().notNull(),
		...timestamps,
	},
	(table) => [
		t
			.index("idx_billing_webhook_events_provider_event")
			.on(table.provider, table.providerEventId),
		t.index("idx_billing_webhook_events_event_type").on(table.eventType),
	],
);
