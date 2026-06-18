import * as t from "drizzle-orm/pg-core";
import { tEvmAddress, timestamps } from "@/lib/platform/db/helpers";
import { randomUuidV7 } from "@/lib/platform/db/random-uuid-v7";
import { users } from "./user";

export const analyticsConsentChoices = [
	"granted",
	"denied",
	"withdrawn",
] as const;
export type AnalyticsConsentChoice = (typeof analyticsConsentChoices)[number];

export const privacyRequestTypes = ["export", "erasure"] as const;
export type PrivacyRequestType = (typeof privacyRequestTypes)[number];

export const privacyRequestStatuses = [
	"submitted",
	"in_review",
	"on_hold",
	"completed",
	"rejected",
] as const;
export type PrivacyRequestStatus = (typeof privacyRequestStatuses)[number];

/** Server-side receipt for analytics consent decisions. */
export const analyticsConsentReceipts = t.pgTable(
	"analytics_consent_receipts",
	{
		id: t.uuid().defaultRandom().primaryKey(),
		walletAddress: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress, { onDelete: "cascade" }),
		choice: t.text({ enum: analyticsConsentChoices }).notNull(),
		policyVersion: t.text().notNull(),
		source: t.text().notNull().default("client"),
		withdrawnAt: t.timestamp({ withTimezone: true }),
		...timestamps,
	},
	(table) => [
		t
			.index("idx_analytics_consent_wallet_created")
			.on(table.walletAddress, table.createdAt),
	],
);

export const privacyRequests = t.pgTable(
	"privacy_requests",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		subjectWalletAddress: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress, { onDelete: "cascade" }),
		type: t.text({ enum: privacyRequestTypes }).notNull(),
		status: t
			.text({ enum: privacyRequestStatuses })
			.notNull()
			.default("submitted"),
		requestedAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
		dueAt: t.timestamp({ withTimezone: true }).notNull(),
		completedAt: t.timestamp({ withTimezone: true }),
		assigneeWalletAddress: tEvmAddress().references(() => users.walletAddress, {
			onDelete: "set null",
		}),
		legalHoldReason: t.text(),
		closureNote: t.text(),
		internalNotes: t.text(),
		...timestamps,
	},
	(table) => [
		t
			.index("idx_privacy_requests_subject_created")
			.on(table.subjectWalletAddress, table.createdAt),
		t.index("idx_privacy_requests_status").on(table.status),
	],
);

export const privacyErasureLedger = t.pgTable(
	"privacy_erasure_ledger",
	{
		id: t.uuid().primaryKey().$defaultFn(randomUuidV7),
		subjectWalletAddress: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress, { onDelete: "cascade" }),
		action: t.text().notNull(),
		executedAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
		replayRequired: t.boolean().notNull().default(true),
		contextJson: t.jsonb().$type<Record<string, unknown>>().default({}),
		...timestamps,
	},
	(table) => [
		t
			.index("idx_privacy_erasure_ledger_subject_executed")
			.on(table.subjectWalletAddress, table.executedAt),
		t
			.index("idx_privacy_erasure_ledger_replay_required")
			.on(table.replayRequired),
	],
);

export const termsAcceptanceReceipts = t.pgTable(
	"terms_acceptance_receipts",
	{
		id: t.uuid().defaultRandom().primaryKey(),
		walletAddress: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress, { onDelete: "cascade" }),
		termsVersion: t.text().notNull(),
		privacyVersion: t.text().notNull(),
		termsSha256: t.text().notNull(),
		privacySha256: t.text().notNull(),
		businessUseAttested: t.boolean().notNull(),
		acceptanceAction: t.text().notNull(),
		ipAddress: t.text(),
		userAgent: t.text(),
		acceptedAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
		...timestamps,
	},
	(table) => [
		t
			.index("idx_terms_acceptance_wallet_created")
			.on(table.walletAddress, table.acceptedAt),
	],
);

export const pilotAddendumAcceptanceReceipts = t.pgTable(
	"pilot_addendum_acceptance_receipts",
	{
		id: t.uuid().defaultRandom().primaryKey(),
		walletAddress: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress, { onDelete: "cascade" }),
		addendumVersion: t.text().notNull(),
		addendumSha256: t.text().notNull(),
		acceptanceAction: t.text().notNull(),
		ipAddress: t.text(),
		userAgent: t.text(),
		acceptedAt: t.timestamp({ withTimezone: true }).notNull().defaultNow(),
		...timestamps,
	},
	(table) => [
		t
			.index("idx_pilot_addendum_wallet_created")
			.on(table.walletAddress, table.acceptedAt),
	],
);
