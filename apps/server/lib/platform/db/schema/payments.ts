import {
	paymentRecipientSources,
	paymentReleaseTypes,
	paymentRuleStatuses,
} from "@filosign/shared";
import * as t from "drizzle-orm/pg-core";
import { tBytes32, tEvmAddress, timestamps } from "@/lib/platform/db/helpers";
import { randomUuidV7 } from "@/lib/platform/db/random-uuid-v7";
import { files } from "./file";

export const filePaymentRules = t.pgTable(
	"file_payment_rules",
	{
		id: t
			.uuid()
			.primaryKey()
			.$defaultFn(() => randomUuidV7()),
		pieceCid: t
			.text()
			.notNull()
			.references(() => files.pieceCid, { onDelete: "cascade" }),
		onChainRuleId: t.bigint({ mode: "bigint" }).notNull(),
		cidIdentifier: tBytes32().notNull(),
		payerWallet: tEvmAddress().notNull(),
		recipientWallet: tEvmAddress().notNull(),
		recipientSource: t.text({ enum: paymentRecipientSources }).notNull(),
		tokenAddress: tEvmAddress().notNull(),
		amount: t.numeric({ precision: 78, scale: 0 }).notNull(),
		releaseType: t.text({ enum: paymentReleaseTypes }).notNull(),
		releaseParams: t.jsonb().$type<Record<string, unknown>>().notNull(),
		status: t.text({ enum: paymentRuleStatuses }).notNull().default("pending"),
		registerRuleTxHash: tBytes32().notNull(),
		approveTxHash: tBytes32().notNull(),
		payoutTxHash: tBytes32(),
		lastError: t.text(),
		lastGelatoRunId: t.text(),
		executedAt: t.timestamp({ withTimezone: true }),
		...timestamps,
	},
	(table) => [
		t.uniqueIndex("uq_file_payment_rules_on_chain").on(table.onChainRuleId),
		t.index("idx_file_payment_rules_piece").on(table.pieceCid),
		t.index("idx_file_payment_rules_status").on(table.status),
	],
);
