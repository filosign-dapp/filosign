import { Contract } from "@ethersproject/contracts";
import {
	Web3Function,
	type Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { type Abi, type Address, encodeFunctionData } from "viem";
import { validatorAbi } from "../lib/contract-abis";
import { payerCanFundPayout } from "../lib/payout-preflight";
import {
	type FilosignWebhookUserArgs,
	registerPayoutWebhooks,
} from "../lib/webhook";

type PendingRule = { onChainRuleId: string; cidId: string };

type UserArgs = FilosignWebhookUserArgs & {
	validatorAddress: string;
	filosignPendingRulesUrl: string;
};

let cachedUserArgs: UserArgs | undefined;

registerPayoutWebhooks(() => {
	if (!cachedUserArgs) {
		return { filosignWebhookUrl: "", filosignWebhookSecret: "" };
	}
	return cachedUserArgs;
});

Web3Function.onRun(async (context: Web3FunctionContext) => {
	const { userArgs, multiChainProvider, storage } = context;
	cachedUserArgs = userArgs as UserArgs;
	const args = cachedUserArgs;
	const validatorAddress = args.validatorAddress as Address;

	if (!validatorAddress || !args.filosignPendingRulesUrl) {
		return {
			canExec: false,
			message: "Missing validator or pending-rules URL",
		};
	}

	const res = await fetch(args.filosignPendingRulesUrl, {
		headers: { "X-Gelato-Webhook-Secret": args.filosignWebhookSecret },
	});
	if (!res.ok) {
		return {
			canExec: false,
			message: `pending-rules fetch failed: ${res.status}`,
		};
	}

	const body = (await res.json()) as { rules?: PendingRule[] };
	const rules = body.rules ?? [];
	if (rules.length === 0) {
		return { canExec: false, message: "No ready payout rules" };
	}

	const provider = multiChainProvider.default();
	const validator = new Contract(validatorAddress, validatorAbi, provider);

	for (const rule of rules) {
		const ruleId = BigInt(rule.onChainRuleId);
		const canRun: boolean = await validator.canExecute(ruleId);
		if (!canRun) continue;
		if (!(await payerCanFundPayout(validator, ruleId))) continue;

		await storage.set("pendingOnChainRuleId", rule.onChainRuleId);
		await storage.set("pendingCidId", rule.cidId);

		const data = encodeFunctionData({
			abi: validatorAbi as Abi,
			functionName: "executePayout",
			args: [ruleId],
		});

		return {
			canExec: true,
			callData: [{ to: validatorAddress, data }],
		};
	}

	return { canExec: false, message: "No executable ready rules on-chain" };
});
