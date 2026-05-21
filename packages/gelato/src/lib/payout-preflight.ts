import { Contract } from "@ethersproject/contracts";
import { erc20BalanceAllowanceAbi, validatorAbi } from "./contract-abis";

type RuleTuple = [
	string,
	string,
	string,
	bigint,
	string,
	number,
	string,
	number,
	boolean,
];

/** True when payer has balance and validator allowance for the rule amount. */
export async function payerCanFundPayout(
	validator: Contract,
	ruleId: bigint,
): Promise<boolean> {
	const provider = validator.provider;
	if (!provider) return false;
	const validatorAddress = validator.address as string;
	const rulesContract = new Contract(validatorAddress, validatorAbi, provider);
	const rule = (await rulesContract.rules(ruleId)) as RuleTuple;
	const [payer, , token, amount, , , , , executed] = rule;
	if (executed || amount === 0n) return false;

	const tokenContract = new Contract(token, erc20BalanceAllowanceAbi, provider);
	const [balance, allowance] = await Promise.all([
		tokenContract.balanceOf(payer) as Promise<bigint>,
		tokenContract.allowance(payer, validatorAddress) as Promise<bigint>,
	]);

	return balance >= amount && allowance >= amount;
}
