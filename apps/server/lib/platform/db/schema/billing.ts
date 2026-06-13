import type { FeatureKey } from "@filosign/entitlements";
import { PLAN_IDS } from "@filosign/entitlements";
import * as t from "drizzle-orm/pg-core";
import { tEvmAddress, timestamps } from "@/lib/platform/db/helpers";
import { randomUuidV7 } from "@/lib/platform/db/random-uuid-v7";
import { users } from "./user";

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
 * One row per wallet - current plan and billing period.
 * Absence of a row means `free` at evaluation time (see entitlement resolver).
 */
export const userSubscriptions = t.pgTable(
	"user_subscriptions",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),

		walletAddress: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress, { onDelete: "cascade" })
			.unique(),

		planId: t.text({ enum: subscriptionPlanIds }).notNull().default("free"),

		status: t.text({ enum: subscriptionStatuses }).notNull().default("active"),

		provider: t
			.text({ enum: subscriptionProviders })
			.notNull()
			.default("manual"),

		periodStart: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
		periodEnd: t.timestamp({ withTimezone: true }),

		cancelAtPeriodEnd: t.boolean().notNull().default(false),

		/** Enterprise / contract limits merged in entitlement resolver. */
		featureOverrides: t
			.jsonb()
			.$type<SubscriptionFeatureOverrides>()
			.notNull()
			.default({}),

		dodoCustomerId: t.text(),
		dodoSubscriptionId: t.text().unique(),

		...timestamps,
	},
	(table) => [
		t.index("idx_user_subscriptions_plan").on(table.planId),
		t.index("idx_user_subscriptions_status").on(table.status),
	],
);

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
