import { and, eq, inArray } from "drizzle-orm";
import type { Address } from "viem";
import db from "@/lib/platform/db";
import { fsPaymentValidatorAt } from "@/lib/platform/evm";
import { logger } from "@/lib/platform/pino";
import { executePayoutLegsUnderLock } from "./payout-lock";
import { preflightSettlementPayout } from "./payout-preflight";

const { fileSettlementRules } = db.schema;

const EXECUTABLE_DB_STATUSES = [
	"pending",
	"ready",
	"partial",
	"failed_insufficient",
	"failed_relay",
	"failed_conditions",
] as const;

export async function tryExecuteSettlementPayout(args: {
	onChainRuleId: bigint;
	validatorAddress: Address;
}): Promise<{
	executed: boolean;
	partial?: boolean;
	txHash?: string;
	skipped?: string;
}> {
	const validator = fsPaymentValidatorAt(args.validatorAddress);
	const preflight = await preflightSettlementPayout({
		onChainRuleId: args.onChainRuleId,
		validatorAddress: args.validatorAddress,
		validator,
	});

	if ("skip" in preflight) {
		const idempotentSuccess =
			preflight.skip === "already_executed" ||
			preflight.skip === "already_executed_on_chain";
		return { executed: idempotentSuccess, skipped: preflight.skip };
	}

	return executePayoutLegsUnderLock({
		validator,
		onChainRuleId: args.onChainRuleId,
		validatorAddress: args.validatorAddress,
		unpaidIndices: preflight.unpaidIndices,
		row: preflight.row,
	});
}

export async function tryExecuteSettlementRulesForPiece(pieceCid: string) {
	const rows = await db
		.select({
			onChainRuleId: fileSettlementRules.onChainRuleId,
			validatorAddress: fileSettlementRules.validatorAddress,
		})
		.from(fileSettlementRules)
		.where(
			and(
				eq(fileSettlementRules.pieceCid, pieceCid),
				inArray(fileSettlementRules.status, [...EXECUTABLE_DB_STATUSES]),
			),
		);

	for (const row of rows) {
		const result = await tryExecuteSettlementPayout({
			onChainRuleId: row.onChainRuleId,
			validatorAddress: row.validatorAddress,
		});
		if ((result.executed || result.partial) && result.txHash) {
			logger.info(
				{
					pieceCid,
					onChainRuleId: row.onChainRuleId.toString(),
					txHash: result.txHash,
					partial: result.partial ?? false,
				},
				"settlement payout executed after sign",
			);
		}
	}
}
