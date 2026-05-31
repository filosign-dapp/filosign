import * as t from "drizzle-orm/pg-core";
import { tEvmAddress, timestamps } from "@/lib/platform/db/helpers";
import { files } from "./file";
import { organizations } from "./organization";
import { users } from "./user";

export const settlementFeatureAccessStatuses = [
	"pending",
	"approved",
	"rejected",
	"revoked",
] as const;

export type SettlementFeatureAccessStatus =
	(typeof settlementFeatureAccessStatuses)[number];

/** Manual approval gate for programmatic payout attachment per workspace. */
export const organizationSettlementFeatureAccess = t.pgTable(
	"organization_settlement_feature_access",
	{
		organizationId: t
			.uuid()
			.primaryKey()
			.references(() => organizations.id, { onDelete: "cascade" }),
		status: t
			.text({ enum: settlementFeatureAccessStatuses })
			.notNull()
			.default("pending"),
		termsVersion: t.text().notNull(),
		acceptedAt: t.timestamp({ withTimezone: true }).notNull(),
		acceptedByWallet: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress),
		useCase: t.text(),
		sanctionsSelfCertAt: t.timestamp({ withTimezone: true }).notNull(),
		reviewedAt: t.timestamp({ withTimezone: true }),
		reviewedByAdminWallet: tEvmAddress(),
		reviewNote: t.text(),
		...timestamps,
	},
	(table) => [
		t.index("idx_org_settlement_access_status").on(table.status),
		t.index("idx_org_settlement_access_accepted_by").on(table.acceptedByWallet),
	],
);

/** Logged when a signer acknowledges optional payout attachment before signing. */
export const fileSettlementRecipientAcks = t.pgTable(
	"file_settlement_recipient_acks",
	{
		filePieceCid: t
			.text()
			.notNull()
			.references(() => files.pieceCid, { onDelete: "cascade" }),
		signerWallet: tEvmAddress()
			.notNull()
			.references(() => users.walletAddress),
		termsVersion: t.text().notNull(),
		acknowledgedAt: t.timestamp({ withTimezone: true }).notNull(),
		requestIp: t.text(),
		requestUserAgent: t.text(),
		...timestamps,
	},
	(table) => [
		t.primaryKey({
			columns: [table.filePieceCid, table.signerWallet],
			name: "pk_file_settlement_recipient_acks",
		}),
		t.index("idx_settlement_recipient_acks_piece").on(table.filePieceCid),
	],
);
