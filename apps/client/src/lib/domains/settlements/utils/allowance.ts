import type { SettlementRuleRow } from "@filosign/react/files";
import { settlementAllowanceRequired } from "@filosign/shared";
import { parseUnits } from "viem";

export type SettlementAllowanceChangeStep =
	| "unknown"
	| "increase"
	| "trim"
	| "none";

export function resolveSettlementRuleLegs(rule: SettlementRuleRow) {
	return rule.legs?.length
		? rule.legs
		: [
				{
					recipientWallet: rule.recipientWallet,
					recipientSource: rule.recipientSource,
					amount: rule.amount,
				},
			];
}

export function draftAmountsToAllowanceLegs(
	rule: SettlementRuleRow,
	draftAmounts: readonly string[],
	decimals: number,
) {
	return resolveSettlementRuleLegs(rule).map((leg, index) => {
		const trimmed = draftAmounts[index]?.trim() ?? "";
		if (!trimmed || Number(trimmed) <= 0) {
			return { amount: leg.amount };
		}
		try {
			return { amount: parseUnits(trimmed, decimals).toString() };
		} catch {
			return { amount: leg.amount };
		}
	});
}

export function settlementAllowanceRequiredAfterUpdate(
	allRules: readonly SettlementRuleRow[],
	rule: SettlementRuleRow,
	draftAmounts: readonly string[],
	decimals: number,
): bigint {
	return settlementAllowanceRequired(allRules, {
		tokenAddress: rule.tokenAddress,
		validatorAddress: rule.validatorAddress,
		replaceRuleId: rule.onChainRuleId,
		legs: draftAmountsToAllowanceLegs(rule, draftAmounts, decimals),
	});
}

export function deriveSettlementAllowanceChangeStep(
	currentAllowance: bigint | null,
	requiredAfter: bigint,
): SettlementAllowanceChangeStep {
	if (currentAllowance === null) return "unknown";
	if (currentAllowance < requiredAfter) return "increase";
	if (currentAllowance > requiredAfter) return "trim";
	return "none";
}

export function settlementAllowanceChangeSummary(
	changeStep: SettlementAllowanceChangeStep,
): string {
	switch (changeStep) {
		case "increase":
			return "Filosign will approve more USDC, update the payout, and save the change.";
		case "trim":
			return "Filosign will update the payout, lower your USDC approval to match, and save the change.";
		case "none":
			return "Filosign will update the payout and save the change.";
		default:
			return "Filosign will update the payout on-chain and save the change.";
	}
}
