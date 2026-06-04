import type {
	SettlementPayoutLegStored,
	SettlementReleaseParams,
	SettlementReleaseType,
} from "@filosign/shared";
import {
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
		tokenAddress: tEvmAddress().notNull(),
		legs: t.jsonb().$type<SettlementPayoutLegStored[]>().notNull(),
		expiresAt: t.numeric({ precision: 78, scale: 0 }),
		releaseType: t.text({ enum: settlementReleaseTypes }).notNull(),
		releaseParams: t.jsonb().$type<SettlementReleaseParams>().notNull(),
		validatorAddress: tEvmAddress().notNull(),
		status: t
			.text({ enum: settlementRuleStatuses })
			.notNull()
			.default("pending"),
		registerRuleTxHash: tBytes32().notNull(),
		approveTxHash: tBytes32().notNull(),
		updateRuleTxHash: tBytes32(),
		cancelRuleTxHash: tBytes32(),
		payoutTxHash: tBytes32(),
		lastError: t.text(),
		executedAt: t.timestamp({ withTimezone: true }),
		...timestamps,
	},
	(table) => [
		t
			.uniqueIndex("uq_file_settlement_rules_validator_rule")
			.on(table.validatorAddress, table.onChainRuleId),
		t.index("idx_file_settlement_rules_piece").on(table.pieceCid),
		t.index("idx_file_settlement_rules_status").on(table.status),
		t.index("idx_file_settlement_rules_validator").on(table.validatorAddress),
	],
);

export type DbSettlementReleaseType = SettlementReleaseType;
