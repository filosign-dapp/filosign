import type { SettlementRuleStatus } from "@filosign/shared";
import type { Address } from "viem";
import db from "@/lib/platform/db";
import type { fsPaymentValidatorAt } from "@/lib/platform/evm";
import { withRelayerLock } from "@/lib/platform/evm/relayer-lock";
import { alertSettlementRelayPayoutFailed } from "./execute-payout-alerts";
import {
	executeSinglePayoutLeg,
	type LegExecutionResult,
} from "./execute-payout-leg";
import { selectSettlementRule, settlementRuleWhere } from "./rule-lookup";

const { fileSettlementRules } = db.schema;

type PayoutRow = NonNullable<Awaited<ReturnType<typeof selectSettlementRule>>>;

export async function executePayoutLegsUnderLock(args: {
	validator: ReturnType<typeof fsPaymentValidatorAt>;
	onChainRuleId: bigint;
	validatorAddress: Address;
	unpaidIndices: number[];
	row: PayoutRow;
}): Promise<{
	executed: boolean;
	partial?: boolean;
	txHash?: string;
	skipped?: string;
}> {
	return withRelayerLock(async () => {
		let lastTxHash: `0x${string}` | undefined;
		let anyLegPaid = false;
		let lastFailureStatus: SettlementRuleStatus | undefined;
		let lastFailureMessage: string | undefined;

		const ruleWhere = settlementRuleWhere({
			validatorAddress: args.validatorAddress,
			onChainRuleId: args.onChainRuleId,
		});

		for (const legIndex of args.unpaidIndices) {
			const result: LegExecutionResult = await executeSinglePayoutLeg({
				validator: args.validator,
				onChainRuleId: args.onChainRuleId,
				validatorAddress: args.validatorAddress,
				legIndex,
			});

			if (result.kind === "failed") {
				lastFailureStatus = result.status;
				lastFailureMessage = result.message;
				continue;
			}
			if (result.kind === "skipped") continue;

			anyLegPaid = true;
			lastTxHash = result.txHash;
			if (result.executed) {
				return { executed: true, txHash: result.txHash };
			}
		}

		if (anyLegPaid) {
			const refreshed = await selectSettlementRule(
				args.onChainRuleId,
				args.validatorAddress,
			);
			if (refreshed?.status === "executed") {
				return { executed: true, txHash: lastTxHash };
			}
			await db
				.update(fileSettlementRules)
				.set({
					status: "partial",
					lastError: lastFailureMessage ?? null,
					updatedAt: new Date(),
				})
				.where(ruleWhere);
			return { executed: false, partial: true, txHash: lastTxHash };
		}

		const status = lastFailureStatus ?? "failed_relay";
		const lastError = lastFailureMessage ?? "execute_failed";
		await db
			.update(fileSettlementRules)
			.set({
				status,
				lastError,
				updatedAt: new Date(),
			})
			.where(ruleWhere);
		if (status === "failed_relay") {
			alertSettlementRelayPayoutFailed({
				onChainRuleId: args.onChainRuleId,
				pieceCid: args.row.pieceCid,
				status,
				error: lastError,
			});
		}
		return { executed: false, skipped: status };
	});
}
