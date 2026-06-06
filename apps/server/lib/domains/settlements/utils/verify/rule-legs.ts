import { throwAppError } from "@filosign/errors/server";
import type { SettlementRuleRegistrationInput } from "@filosign/shared";
import { getAddress } from "viem";
import type { fsPaymentValidatorAt } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

export async function assertOnChainRuleLegsMatch(args: {
	validator: ReturnType<typeof fsPaymentValidatorAt>;
	rule: SettlementRuleRegistrationInput;
}): Promise<void> {
	const ruleId = BigInt(args.rule.onChainRuleId);
	const legsRes = await tryCatch(args.validator.read.ruleLegs([ruleId]));
	if (legsRes.error || !legsRes.data?.length) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason: "On-chain payout legs missing for settlement rule",
			},
		});
	}
	if (legsRes.data.length !== args.rule.legs.length) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason: "On-chain leg count does not match submitted settlement rule",
			},
		});
	}
	for (let i = 0; i < args.rule.legs.length; i++) {
		const submitted = args.rule.legs[i];
		const onChain = legsRes.data[i];
		if (
			getAddress(onChain.recipient) !== getAddress(submitted.recipientWallet)
		) {
			throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
				params: {
					reason: "On-chain payout recipient does not match submitted leg",
				},
			});
		}
		if (onChain.amount !== BigInt(submitted.amount)) {
			throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
				params: {
					reason: "On-chain payout amount does not match submitted leg",
				},
			});
		}
	}
}
