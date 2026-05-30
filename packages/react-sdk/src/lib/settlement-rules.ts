import type { FilosignContracts } from "@filosign/contracts";
import { type ChainKey, getContractAbi } from "@filosign/contracts";
import type {
	SettlementRecipientSource,
	SettlementReleaseType,
	SettlementRuleCancelInput,
	SettlementRuleRegistrationInput,
	SettlementRuleUpdateInput,
} from "@filosign/shared";
import {
	SETTLEMENT_RELEASE_TYPE_UINT,
	settlementRuleTotalAmount,
} from "@filosign/shared";
import { type Address, encodeFunctionData, type Hex } from "viem";
import type { FilosignWallet } from "./wallet";

export type SettlementRuleDraftLeg = {
	recipientWallet: Address;
	recipientSource: SettlementRecipientSource;
	amount: bigint;
};

export type SettlementRuleDraft = {
	legs: SettlementRuleDraftLeg[];
	tokenAddress: Address;
	releaseType: SettlementReleaseType;
	releaseParams: SettlementRuleRegistrationInput["releaseParams"];
	expiresAt?: bigint;
};

const ZERO_COMMITMENT = `0x${"00".repeat(32)}` as Hex;

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
			throw new Error("Duplicate signer commitment in settlement rule");
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
	return SETTLEMENT_RELEASE_TYPE_UINT[releaseType];
}

export function releaseParamsToContractArgs(
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
			specificSignerCommitment: ZERO_COMMITMENT,
			thresholdN: releaseParams.thresholdN,
			signerCommitments: uniqueSignerCommitments(
				releaseParams.signerEmailCommitments,
				releaseParams.thresholdN,
			),
		};
	}
	if (
		releaseType === "quorum_required" &&
		releaseParams.releaseType === "quorum_required"
	) {
		return {
			specificSignerCommitment: ZERO_COMMITMENT,
			thresholdN: releaseParams.thresholdN,
			signerCommitments: [],
		};
	}
	if (
		releaseType === "quorum_set" &&
		releaseParams.releaseType === "quorum_set"
	) {
		return {
			specificSignerCommitment: ZERO_COMMITMENT,
			thresholdN: releaseParams.thresholdN,
			signerCommitments: uniqueSignerCommitments(
				releaseParams.signerEmailCommitments,
				releaseParams.thresholdN,
			),
		};
	}
	if (
		releaseType === "quorum_all" &&
		releaseParams.releaseType === "quorum_all"
	) {
		return {
			specificSignerCommitment: ZERO_COMMITMENT,
			thresholdN: releaseParams.thresholdN,
			signerCommitments: [],
		};
	}
	if (
		releaseType === "all_of_set" &&
		releaseParams.releaseType === "all_of_set"
	) {
		return {
			specificSignerCommitment: ZERO_COMMITMENT,
			thresholdN: 0,
			signerCommitments: uniqueSignerCommitments(
				releaseParams.signerEmailCommitments,
				releaseParams.signerEmailCommitments.length,
			),
		};
	}
	return {
		specificSignerCommitment: ZERO_COMMITMENT,
		thresholdN: 0,
		signerCommitments: [],
	};
}

function assertSettlementLegs(legs: SettlementRuleDraftLeg[]) {
	if (legs.length === 0 || legs.length > 32) {
		throw new Error("Settlement rule must have 1–32 payout legs");
	}
}

function erc20ApproveAbi(chainKey: ChainKey) {
	try {
		return getContractAbi("MockUSDC", chainKey);
	} catch {
		return getContractAbi("MockUSDC", "local");
	}
}

function toRegistrationLegs(legs: SettlementRuleDraftLeg[]) {
	return legs.map((leg) => ({
		recipientWallet: leg.recipientWallet,
		recipientSource: leg.recipientSource,
		amount: leg.amount.toString(),
	}));
}

function toContractPayoutLegs(legs: SettlementRuleDraftLeg[]) {
	return legs.map((leg) => ({
		recipient: leg.recipientWallet,
		amount: leg.amount,
	}));
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
		assertSettlementLegs(rule.legs);
		const totalAmount = settlementRuleTotalAmount(
			rule.legs.map((leg) => ({ amount: leg.amount.toString() })),
		);
		const expiresAt = rule.expiresAt ?? 0n;
		const { specificSignerCommitment, thresholdN, signerCommitments } =
			releaseParamsToContractArgs(rule.releaseType, rule.releaseParams);
		const contractLegs = toContractPayoutLegs(rule.legs);

		const approveData = encodeFunctionData({
			abi: approveAbi,
			functionName: "approve",
			args: [validator.address, totalAmount],
		});

		const registerData = encodeFunctionData({
			abi: validatorAbi,
			functionName: "registerRule",
			args: [
				args.payer,
				rule.tokenAddress,
				args.cidIdentifier,
				releaseTypeToUint8(rule.releaseType),
				specificSignerCommitment,
				thresholdN,
				expiresAt,
				signerCommitments,
				contractLegs,
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
			legs: toRegistrationLegs(rule.legs),
			tokenAddress: rule.tokenAddress,
			cidIdentifier: args.cidIdentifier,
			releaseType: rule.releaseType,
			releaseParams: rule.releaseParams,
			expiresAt: expiresAt === 0n ? undefined : expiresAt.toString(),
			registerRuleTxHash: registerHash,
			approveTxHash: approveHash,
		});
	}

	return registered;
}

export async function updateSettlementRuleOnChain(args: {
	wallet: FilosignWallet;
	contracts: FilosignContracts;
	onChainRuleId: string;
	releaseType: SettlementReleaseType;
	releaseParams: SettlementRuleDraft["releaseParams"];
	legs: SettlementRuleDraftLeg[];
	expiresAt?: bigint;
}): Promise<Pick<SettlementRuleUpdateInput, "updateRuleTxHash">> {
	const validator = args.contracts.FSPaymentValidator;
	if (!validator) {
		throw new Error(
			"FSPaymentValidator is not deployed on this chain. Run contracts deploy/migrate first.",
		);
	}

	assertSettlementLegs(args.legs);

	const expiresAt = args.expiresAt ?? 0n;
	const { specificSignerCommitment, thresholdN, signerCommitments } =
		releaseParamsToContractArgs(args.releaseType, args.releaseParams);

	const data = encodeFunctionData({
		abi: validator.abi,
		functionName: "updatePayoutRule",
		args: [
			BigInt(args.onChainRuleId),
			releaseTypeToUint8(args.releaseType),
			specificSignerCommitment,
			thresholdN,
			expiresAt,
			signerCommitments,
			toContractPayoutLegs(args.legs),
		],
	});

	const updateRuleTxHash = await args.wallet.sendTransaction({
		to: validator.address,
		data,
		account: args.wallet.account,
		chain: args.wallet.chain,
	});

	return { updateRuleTxHash };
}

export async function cancelSettlementRuleOnChain(args: {
	wallet: FilosignWallet;
	contracts: FilosignContracts;
	onChainRuleId: string;
}): Promise<Pick<SettlementRuleCancelInput, "cancelRuleTxHash">> {
	const validator = args.contracts.FSPaymentValidator;
	if (!validator) {
		throw new Error(
			"FSPaymentValidator is not deployed on this chain. Run contracts deploy/migrate first.",
		);
	}

	const data = encodeFunctionData({
		abi: validator.abi,
		functionName: "cancelPayoutRule",
		args: [BigInt(args.onChainRuleId)],
	});

	const cancelRuleTxHash = await args.wallet.sendTransaction({
		to: validator.address,
		data,
		account: args.wallet.account,
		chain: args.wallet.chain,
	});

	return { cancelRuleTxHash };
}

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
