import type { FilosignContracts } from "@filosign/contracts";
import type {
	PaymentReleaseType,
	PaymentRuleRegistrationInput,
} from "@filosign/shared";
import { type Address, encodeFunctionData, type Hex } from "viem";

export type PaymentRuleDraft = {
	recipientWallet: Address;
	recipientSource: "signer" | "viewer" | "org_wallet";
	amount: bigint;
	tokenAddress: Address;
	releaseType: PaymentReleaseType;
	releaseParams: PaymentRuleRegistrationInput["releaseParams"];
};

const validatorAbi = [
	{
		type: "function",
		name: "registerRule",
		inputs: [
			{ name: "payer_", type: "address" },
			{ name: "recipient_", type: "address" },
			{ name: "token_", type: "address" },
			{ name: "amount_", type: "uint256" },
			{ name: "cidId_", type: "bytes32" },
			{ name: "releaseType_", type: "uint8" },
			{ name: "specificSignerCommitment_", type: "bytes32" },
			{ name: "thresholdN_", type: "uint8" },
			{ name: "signerCommitments_", type: "bytes32[]" },
		],
		outputs: [{ type: "uint256" }],
		stateMutability: "nonpayable",
	},
] as const;

const erc20Abi = [
	{
		type: "function",
		name: "approve",
		inputs: [
			{ name: "spender", type: "address" },
			{ name: "amount", type: "uint256" },
		],
		outputs: [{ type: "bool" }],
		stateMutability: "nonpayable",
	},
] as const;

function releaseTypeToUint8(releaseType: PaymentReleaseType): number {
	switch (releaseType) {
		case "all_signed":
			return 0;
		case "specific_signer":
			return 1;
		case "at_least_n":
			return 2;
	}
}

function releaseParamsToContractArgs(
	releaseType: PaymentReleaseType,
	releaseParams: PaymentRuleDraft["releaseParams"],
): {
	specificSignerCommitment: Hex;
	thresholdN: number;
	signerCommitments: Hex[];
} {
	if (
		releaseType === "specific_signer" &&
		releaseParams.releaseType === "specific_signer"
	) {
		return {
			specificSignerCommitment: releaseParams.signerEmailCommitment,
			thresholdN: 0,
			signerCommitments: [],
		};
	}
	if (
		releaseType === "at_least_n" &&
		releaseParams.releaseType === "at_least_n"
	) {
		return {
			specificSignerCommitment: `0x${"00".repeat(32)}` as Hex,
			thresholdN: releaseParams.thresholdN,
			signerCommitments: releaseParams.signerEmailCommitments,
		};
	}
	return {
		specificSignerCommitment: `0x${"00".repeat(32)}` as Hex,
		thresholdN: 0,
		signerCommitments: [],
	};
}

export async function registerPaymentRulesOnChain(args: {
	wallet: NonNullable<FilosignContracts["$client"]>;
	contracts: FilosignContracts;
	payer: Address;
	cidIdentifier: Hex;
	rules: PaymentRuleDraft[];
}): Promise<PaymentRuleRegistrationInput[]> {
	const validator = args.contracts.FSPaymentValidator;
	if (!validator) {
		throw new Error(
			"FSPaymentValidator is not deployed on this chain. Run contracts deploy/migrate first.",
		);
	}

	const registered: PaymentRuleRegistrationInput[] = [];

	for (const rule of args.rules) {
		const { specificSignerCommitment, thresholdN, signerCommitments } =
			releaseParamsToContractArgs(rule.releaseType, rule.releaseParams);

		const approveData = encodeFunctionData({
			abi: erc20Abi,
			functionName: "approve",
			args: [validator.address, rule.amount],
		});

		const registerData = encodeFunctionData({
			abi: validatorAbi,
			functionName: "registerRule",
			args: [
				args.payer,
				rule.recipientWallet,
				rule.tokenAddress,
				rule.amount,
				args.cidIdentifier,
				releaseTypeToUint8(rule.releaseType),
				specificSignerCommitment,
				thresholdN,
				signerCommitments,
			],
		});

		const onChainRuleId = (await validator.read.nextRuleId([])) as bigint;

		const approveHash = await args.wallet.sendTransaction({
			to: rule.tokenAddress,
			data: approveData,
			account: args.wallet.account,
			chain: args.wallet.chain,
		});

		const registerHash = await args.wallet.sendTransaction({
			to: validator.address,
			data: registerData,
			account: args.wallet.account,
			chain: args.wallet.chain,
		});

		registered.push({
			onChainRuleId: onChainRuleId.toString(10),
			recipientWallet: rule.recipientWallet,
			recipientSource: rule.recipientSource,
			tokenAddress: rule.tokenAddress,
			amount: rule.amount.toString(),
			cidIdentifier: args.cidIdentifier,
			releaseType: rule.releaseType,
			releaseParams: rule.releaseParams,
			registerRuleTxHash: registerHash,
			approveTxHash: approveHash,
		});
	}

	return registered;
}
