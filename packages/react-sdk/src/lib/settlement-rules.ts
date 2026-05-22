import type { FilosignContracts } from "@filosign/contracts";
import { type ChainKey, getContractAbi } from "@filosign/contracts";
import type {
	SettlementReleaseType,
	SettlementRuleRegistrationInput,
} from "@filosign/shared";
import { type Address, encodeFunctionData, type Hex } from "viem";
import type { FilosignWallet } from "./wallet";

export type SettlementRuleDraft = {
	recipientWallet: Address;
	recipientSource: "signer" | "viewer" | "org_wallet";
	amount: bigint;
	tokenAddress: Address;
	releaseType: SettlementReleaseType;
	releaseParams: SettlementRuleRegistrationInput["releaseParams"];
};

const ZERO_COMMITMENT = `0x${"00".repeat(32)}` as Hex;

/** Matches on-chain AtLeastN rules: no zero or duplicate email commitments. */
function uniqueSignerCommitments(
	commitments: Hex[],
	thresholdN: number,
): Hex[] {
	const unique: Hex[] = [];
	const seen = new Set<string>();
	for (const c of commitments) {
		if (c === ZERO_COMMITMENT) {
			throw new Error("Signer commitment must be non-zero");
		}
		const key = c.toLowerCase();
		if (seen.has(key)) {
			throw new Error("Duplicate signer commitment in at_least_n rule");
		}
		seen.add(key);
		unique.push(c);
	}
	if (thresholdN > unique.length) {
		throw new Error(
			"thresholdN cannot exceed the number of unique signer commitments",
		);
	}
	return unique;
}

function releaseTypeToUint8(releaseType: SettlementReleaseType): number {
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
	releaseType: SettlementReleaseType,
	releaseParams: SettlementRuleDraft["releaseParams"],
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
			signerCommitments: uniqueSignerCommitments(
				releaseParams.signerEmailCommitments,
				releaseParams.thresholdN,
			),
		};
	}
	return {
		specificSignerCommitment: `0x${"00".repeat(32)}` as Hex,
		thresholdN: 0,
		signerCommitments: [],
	};
}

function erc20ApproveAbi(chainKey: ChainKey) {
	try {
		return getContractAbi("MockUSDC", chainKey);
	} catch {
		return getContractAbi("MockUSDC", "local");
	}
}

export async function registerSettlementRulesOnChain(args: {
	wallet: FilosignWallet;
	contracts: FilosignContracts;
	chainKey: ChainKey;
	payer: Address;
	cidIdentifier: Hex;
	rules: SettlementRuleDraft[];
}): Promise<SettlementRuleRegistrationInput[]> {
	const validator = args.contracts.FSPaymentValidator;
	if (!validator) {
		throw new Error(
			"FSPaymentValidator is not deployed on this chain. Run contracts deploy/migrate first.",
		);
	}

	const validatorAbi = validator.abi;
	const approveAbi = erc20ApproveAbi(args.chainKey);
	const registered: SettlementRuleRegistrationInput[] = [];

	for (const rule of args.rules) {
		const { specificSignerCommitment, thresholdN, signerCommitments } =
			releaseParamsToContractArgs(rule.releaseType, rule.releaseParams);

		const approveData = encodeFunctionData({
			abi: approveAbi,
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

		const onChainRuleId = await validator.read.nextRuleId();

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

/** Relays executePayout when release conditions and payer funding are met. */
export async function executeSettlementPayoutOnChain(args: {
	wallet: FilosignWallet;
	contracts: FilosignContracts;
	onChainRuleId: string;
}): Promise<Hex> {
	const validator = args.contracts.FSPaymentValidator;
	if (!validator) {
		throw new Error(
			"FSPaymentValidator is not deployed on this chain. Run contracts deploy/migrate first.",
		);
	}

	const data = encodeFunctionData({
		abi: validator.abi,
		functionName: "executePayout",
		args: [BigInt(args.onChainRuleId)],
	});

	return args.wallet.sendTransaction({
		to: validator.address,
		data,
		account: args.wallet.account,
		chain: args.wallet.chain,
	});
}

/** Revokes ERC-20 allowance for FSPaymentValidator (approve 0). Blocks future executePayout. */
export async function revokeSettlementValidatorAllowance(args: {
	wallet: FilosignWallet;
	contracts: FilosignContracts;
	chainKey: ChainKey;
	tokenAddress: Address;
}): Promise<Hex> {
	const validator = args.contracts.FSPaymentValidator;
	if (!validator) {
		throw new Error(
			"FSPaymentValidator is not deployed on this chain. Run contracts deploy/migrate first.",
		);
	}

	const data = encodeFunctionData({
		abi: erc20ApproveAbi(args.chainKey),
		functionName: "approve",
		args: [validator.address, 0n],
	});

	return args.wallet.sendTransaction({
		to: args.tokenAddress,
		data,
		account: args.wallet.account,
		chain: args.wallet.chain,
	});
}
