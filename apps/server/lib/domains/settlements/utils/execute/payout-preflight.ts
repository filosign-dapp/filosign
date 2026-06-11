import type { SettlementPayoutLegStored } from "@filosign/shared";
import type { Address } from "viem";
import { getAddress } from "viem";
import db from "@/lib/platform/db";
import type { fsPaymentValidatorAt } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { payerCanFundSettlement } from "../preflight";
import { selectSettlementRule, settlementRuleWhere } from "../rule-lookup";
import { syncSettlementPayoutFromChain } from "../sync-from-chain";
import { listUnpaidSettlementLegIndices } from "../sync-legs-from-chain";
import { pollCanExecute } from "./payout-readiness";

const { fileSettlementRules } = db.schema;

export async function preflightSettlementPayout(args: {
	onChainRuleId: bigint;
	validatorAddress: Address;
	validator: ReturnType<typeof fsPaymentValidatorAt>;
}) {
	const { onChainRuleId, validatorAddress, validator } = args;
	const row = await selectSettlementRule(onChainRuleId, validatorAddress);

	if (!row) return { skip: "rule_not_indexed" as const };

	const ruleWhere = settlementRuleWhere({ validatorAddress, onChainRuleId });

	if (row.status === "executed") {
		return { skip: "already_executed" as const };
	}
	if (row.status === "cancelled") {
		return { skip: "cancelled" as const };
	}

	const executedOnChain = await tryCatch(validator.read.rules([onChainRuleId]));
	if (!executedOnChain.error && executedOnChain.data[8]) {
		await syncSettlementPayoutFromChain(onChainRuleId, validatorAddress);
		return { skip: "cancelled" as const };
	}
	if (!executedOnChain.error && executedOnChain.data[7]) {
		await syncSettlementPayoutFromChain(onChainRuleId, validatorAddress);
		return { skip: "already_executed_on_chain" as const };
	}

	const canExecute = await pollCanExecute({ validator, onChainRuleId });
	if (!canExecute) {
		return { skip: "not_executable" as const };
	}

	const unpaidIndices = await listUnpaidSettlementLegIndices({
		validatorAddress,
		onChainRuleId,
		legCount: row.legs.length,
	});
	if (!unpaidIndices || unpaidIndices.length === 0) {
		await syncSettlementPayoutFromChain(onChainRuleId, validatorAddress);
		const refreshed = await selectSettlementRule(
			onChainRuleId,
			validatorAddress,
		);
		if (refreshed?.status === "executed") {
			return { skip: "already_executed_on_chain" as const };
		}
		return { skip: "no_unpaid_legs" as const };
	}

	const unpaidAmount = unpaidIndices.reduce((sum, index) => {
		const leg = row.legs[index] as SettlementPayoutLegStored | undefined;
		return leg ? sum + BigInt(leg.amount) : sum;
	}, 0n);

	const fundedRes = await tryCatch(
		payerCanFundSettlement({
			onChainRuleId,
			payer: getAddress(row.payerWallet),
			token: getAddress(row.tokenAddress),
			amount: unpaidAmount,
			validator: validatorAddress,
		}),
	);
	if (fundedRes.error || !fundedRes.data) {
		await db
			.update(fileSettlementRules)
			.set({
				status: "failed_insufficient",
				lastError: "insufficient_balance_or_allowance",
				updatedAt: new Date(),
			})
			.where(ruleWhere);
		return { skip: "insufficient_funds" as const };
	}

	return {
		row,
		ruleWhere,
		unpaidIndices,
	};
}
