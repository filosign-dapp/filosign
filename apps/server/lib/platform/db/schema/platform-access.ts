import { PLAN_IDS } from "@filosign/entitlements";
import * as t from "drizzle-orm/pg-core";
import { tEvmAddress, timestamps } from "@/lib/platform/db/helpers";
import { randomUuidV7 } from "@/lib/platform/db/random-uuid-v7";
import type { SubscriptionFeatureOverrides } from "@/lib/platform/db/schema/billing";
import { organizations } from "./organization";
import { users } from "./user";

export const platformInviteKinds = ["partner_trial", "manual_paid"] as const;

export type PlatformInviteKind = (typeof platformInviteKinds)[number];

export const platformAccessPendingStatuses = [
	"pending_wallet",
	"linked",
	"expired",
] as const;

export type PlatformAccessPendingStatus =
	(typeof platformAccessPendingStatuses)[number];

export const platformInvites = t.pgTable(
	"platform_invites",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		token: t.text().notNull().unique(),
		kind: t.text({ enum: platformInviteKinds }).notNull(),
		email: t.text(),
		planId: t.text({ enum: PLAN_IDS }).notNull().default("teams_pro"),
		trialDays: t.integer().notNull().default(30),
		featureOverrides: t
			.jsonb()
			.$type<SubscriptionFeatureOverrides>()
			.notNull()
			.default({}),
		maxRedemptions: t.integer().notNull().default(1),
		redemptionCount: t.integer().notNull().default(0),
		expiresAt: t.timestamp({ withTimezone: true }),
		revokedAt: t.timestamp({ withTimezone: true }),
		createdByAdminWallet: tEvmAddress(),
		note: t.text(),
		...timestamps,
	},
	(table) => [
		t.index("idx_platform_invites_token").on(table.token),
		t.index("idx_platform_invites_revoked").on(table.revokedAt),
	],
);

export const platformInviteRedemptions = t.pgTable(
	"platform_invite_redemptions",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		inviteId: t
			.uuid()
			.notNull()
			.references(() => platformInvites.id, { onDelete: "cascade" }),
		walletAddress: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress, { onDelete: "cascade" }),
		email: t.text().notNull(),
		redeemedAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		t
			.uniqueIndex("idx_platform_invite_redemptions_invite_wallet")
			.on(table.inviteId, table.walletAddress),
		t.index("idx_platform_invite_redemptions_wallet").on(table.walletAddress),
	],
);

export const checkoutIntentStatuses = [
	"pending",
	"checkout_open",
	"completed",
	"expired",
] as const;

export type CheckoutIntentStatus = (typeof checkoutIntentStatuses)[number];

/** Phase 2 — email-verified checkout magic link before Dodo session. */
export const checkoutIntents = t.pgTable(
	"checkout_intents",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		continueToken: t.text().notNull().unique(),
		setupToken: t.text().notNull().unique(),
		email: t.text().notNull(),
		planId: t.text({ enum: PLAN_IDS }).notNull(),
		billingInterval: t.text({ enum: ["monthly", "yearly"] }).notNull(),
		status: t
			.text({ enum: checkoutIntentStatuses })
			.notNull()
			.default("pending"),
		dodoSessionId: t.text(),
		seatCount: t.integer().notNull().default(1),
		expiresAt: t.timestamp({ withTimezone: true }).notNull(),
		...timestamps,
	},
	(table) => [
		t.index("idx_checkout_intents_email").on(table.email),
		t.index("idx_checkout_intents_status").on(table.status),
	],
);

export const accessRequestStatuses = [
	"pending",
	"approved",
	"rejected",
] as const;

export type AccessRequestStatus = (typeof accessRequestStatuses)[number];

/** Phase 3 — marketing waitlist before admin issues partner invite. */
export const accessRequests = t.pgTable(
	"access_requests",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		email: t.text().notNull(),
		name: t.text(),
		company: t.text(),
		message: t.text(),
		status: t
			.text({ enum: accessRequestStatuses })
			.notNull()
			.default("pending"),
		reviewedAt: t.timestamp({ withTimezone: true }),
		reviewedByAdminWallet: tEvmAddress(),
		createdInviteId: t
			.uuid()
			.references(() => platformInvites.id, { onDelete: "set null" }),
		...timestamps,
	},
	(table) => [
		t.index("idx_access_requests_email").on(table.email),
		t.index("idx_access_requests_status").on(table.status),
	],
);

/** Phase 2 — paid checkout setup recovery before wallet links. */
export const platformAccessPending = t.pgTable(
	"platform_access_pending",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		setupToken: t.text().notNull().unique(),
		email: t.text().notNull(),
		planId: t.text({ enum: PLAN_IDS }).notNull(),
		dodoSubscriptionId: t.text().unique(),
		dodoCustomerId: t.text(),
		seatCount: t.integer().notNull().default(1),
		billingInterval: t.text({ enum: ["monthly", "yearly"] }),
		status: t
			.text({ enum: platformAccessPendingStatuses })
			.notNull()
			.default("pending_wallet"),
		linkedWallet: tEvmAddress().references(() => users.walletAddress, {
			onDelete: "set null",
		}),
		linkedOrganizationId: t
			.uuid()
			.references(() => organizations.id, { onDelete: "set null" }),
		expiresAt: t.timestamp({ withTimezone: true }).notNull(),
		...timestamps,
	},
	(table) => [
		t.index("idx_platform_access_pending_email").on(table.email),
		t.index("idx_platform_access_pending_status").on(table.status),
	],
);
