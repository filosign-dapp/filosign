import { Contract } from "@ethersproject/contracts";
import {
	Web3Function,
	type Web3FunctionEventContext,
} from "@gelatonetwork/web3-functions-sdk";
import { type Abi, type Address, encodeFunctionData, type Hex } from "viem";
import { fileRegistryAbi, validatorAbi } from "../lib/contract-abis";
import { payerCanFundPayout } from "../lib/payout-preflight";
import {
	type FilosignWebhookUserArgs,
	registerPayoutWebhooks,
} from "../lib/webhook";

type UserArgs = FilosignWebhookUserArgs & {
	validatorAddress: string;
	registryAddress: string;
};

let cachedUserArgs: UserArgs | undefined;

registerPayoutWebhooks(() => {
	if (!cachedUserArgs) {
		return { filosignWebhookUrl: "", filosignWebhookSecret: "" };
	}
	return cachedUserArgs;
});

Web3Function.onRun(async (context: Web3FunctionEventContext) => {
	const { userArgs, multiChainProvider, log, storage } = context;
	cachedUserArgs = userArgs as UserArgs;
	const args = cachedUserArgs;
	const validatorAddress = args.validatorAddress as Address;
	const registryAddress = args.registryAddress as Address;

	if (!validatorAddress || !registryAddress) {
		return { canExec: false, message: "Missing validator or registry address" };
	}

	const cidId = log.topics[1] as Hex | undefined;
	if (!cidId) {
		return { canExec: false, message: "No FileSigned cidId in log" };
	}

	const provider = multiChainProvider.default();
	const registry = new Contract(registryAddress, fileRegistryAbi, provider);
	const validator = new Contract(validatorAddress, validatorAbi, provider);

	const allSigned: boolean = await registry.allSigned(cidId);
	const ruleIds: bigint[] = await validator.ruleIdsForCid(cidId);

	if (ruleIds.length === 0) {
		return { canExec: false, message: "No payment rules for document" };
	}

	for (const ruleId of ruleIds) {
		const canRun: boolean = await validator.canExecute(ruleId);
		if (!canRun) continue;
		if (!(await payerCanFundPayout(validator, ruleId))) continue;

		await storage.set("pendingOnChainRuleId", ruleId.toString());
		await storage.set("pendingCidId", cidId);

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

	return {
		canExec: false,
		message: allSigned
			? "Rules not executable (balance/allowance or already paid)"
			: "Release conditions not met",
	};
});
