import { type ChainKey, getContractAbi } from "@filosign/contracts";
import type { Address } from "viem";
import config from "@/config";
import { evmClient, fsPaymentValidatorAt } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

function erc20BalanceAllowanceAbi(chainKey: ChainKey) {
	try {
		return getContractAbi("MockUSDC", chainKey);
	} catch {
		return getContractAbi("MockUSDC", "local");
	}
}

export async function payerCanFundSettlement(args: {
	onChainRuleId: bigint;
	payer: Address;
	token: Address;
	amount: bigint;
	validator: Address;
}): Promise<boolean> {
	const validator = fsPaymentValidatorAt(args.validator);

	const ruleRes = await tryCatch(validator.read.rules([args.onChainRuleId]));
	if (ruleRes.error) return false;
	const executed = ruleRes.data[7];
	if (executed || args.amount === 0n) return false;

	const tokenAbi = erc20BalanceAllowanceAbi(config.chainKey);
	const [balance, allowance] = await Promise.all([
		evmClient.readContract({
			address: args.token,
			abi: tokenAbi,
			functionName: "balanceOf",
			args: [args.payer],
		}) as Promise<bigint>,
		evmClient.readContract({
			address: args.token,
			abi: tokenAbi,
			functionName: "allowance",
			args: [args.payer, args.validator],
		}) as Promise<bigint>,
	]);

	return balance >= args.amount && allowance >= args.amount;
}
