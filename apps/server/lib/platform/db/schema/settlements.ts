import {
	settlementRecipientSources,
	settlementReleaseTypes,
	settlementRuleStatuses,
} from "@filosign/shared";
import * as t from "drizzle-orm/pg-core";
import { tBytes32, tEvmAddress, timestamps } from "@/lib/platform/db/helpers";
import { randomUuidV7 } from "@/lib/platform/db/random-uuid-v7";
import { files } from "./file";

export const fileSettlementRules = t.pgTable(
	"file_settlement_rules",
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
		recipientSource: t.text({ enum: settlementRecipientSources }).notNull(),
		tokenAddress: tEvmAddress().notNull(),
		amount: t.numeric({ precision: 78, scale: 0 }).notNull(),
		releaseType: t.text({ enum: settlementReleaseTypes }).notNull(),
		releaseParams: t.jsonb().$type<Record<string, unknown>>().notNull(),
		validatorAddress: tEvmAddress().notNull(),
		status: t
			.text({ enum: settlementRuleStatuses })
			.notNull()
			.default("pending"),
		registerRuleTxHash: tBytes32().notNull(),
		approveTxHash: tBytes32().notNull(),
		payoutTxHash: tBytes32(),
		lastError: t.text(),
		lastGelatoRunId: t.text(),
		executedAt: t.timestamp({ withTimezone: true }),
		...timestamps,
	},
	(table) => [
		t.uniqueIndex("uq_file_settlement_rules_on_chain").on(table.onChainRuleId),
		t.index("idx_file_settlement_rules_piece").on(table.pieceCid),
		t.index("idx_file_settlement_rules_status").on(table.status),
		t.index("idx_file_settlement_rules_validator").on(table.validatorAddress),
	],
);
