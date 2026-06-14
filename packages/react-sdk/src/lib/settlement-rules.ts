import type { FilosignContracts } from "@filosign/evm";
import { type ChainKey, getContractAbi } from "@filosign/evm";
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
import type { SendFileProgressReporter } from "./send-file/progress";
import { emitSendFileProgress } from "./send-file/progress";
import {
	paymentValidatorAt,
	simulateSettlementWrite,
} from "./settlement-preflight";
import { parseRuleIdFromReceipt, waitForTxReceipt } from "./tx-receipt";
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
	onProgress?: SendFileProgressReporter;
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
	const ruleCount = args.rules.length;

	for (let ruleIndex = 0; ruleIndex < args.rules.length; ruleIndex++) {
		const rule = args.rules[ruleIndex];
		if (!rule) continue;
		const payoutDetail =
			ruleCount > 1 ? `Payout ${ruleIndex + 1} of ${ruleCount}` : undefined;

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

		await simulateSettlementWrite({
			contracts: args.contracts,
			wallet: args.wallet,
			address: rule.tokenAddress,
			abi: approveAbi,
			functionName: "approve",
			args: [validator.address, totalAmount],
		});

		emitSendFileProgress(args.onProgress, {
			phase: "wallet_payout_approve",
			status: "wallet_prompt",
			ruleIndex,
			detail: payoutDetail,
		});

		const approveHash = await args.wallet.sendTransaction({
			to: rule.tokenAddress,
			data: approveData,
			account: args.wallet.account,
			chain: args.wallet.chain,
		});
		emitSendFileProgress(args.onProgress, {
			phase: "confirming_transaction",
			status: "confirming",
			ruleIndex,
			detail: payoutDetail,
			txLabel: "USDC approval",
		});
		await waitForTxReceipt(args.contracts, approveHash);
		emitSendFileProgress(args.onProgress, {
			phase: "wallet_payout_approve",
			status: "done",
			ruleIndex,
			detail: payoutDetail,
		});

		await simulateSettlementWrite({
			contracts: args.contracts,
			wallet: args.wallet,
			address: validator.address,
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

		emitSendFileProgress(args.onProgress, {
			phase: "wallet_payout_register",
			status: "wallet_prompt",
			ruleIndex,
			detail: payoutDetail,
		});

		const registerHash = await args.wallet.sendTransaction({
			to: validator.address,
			data: registerData,
			account: args.wallet.account,
			chain: args.wallet.chain,
		});
		emitSendFileProgress(args.onProgress, {
			phase: "confirming_transaction",
			status: "confirming",
			ruleIndex,
			detail: payoutDetail,
			txLabel: "payout registration",
		});
		const registerReceipt = await waitForTxReceipt(
			args.contracts,
			registerHash,
		);
		const onChainRuleId = parseRuleIdFromReceipt({
			receipt: registerReceipt,
			emitter: validator.address,
			abi: validatorAbi,
			eventName: "PaymentRuleRegistered",
		});

		registered.push({
			onChainRuleId,
			legs: toRegistrationLegs(rule.legs),
			tokenAddress: rule.tokenAddress,
			cidIdentifier: args.cidIdentifier,
			releaseType: rule.releaseType,
			releaseParams: rule.releaseParams,
			expiresAt: expiresAt === 0n ? undefined : expiresAt.toString(),
			registerRuleTxHash: registerHash,
			approveTxHash: approveHash,
		});

		emitSendFileProgress(args.onProgress, {
			phase: "wallet_payout_register",
			status: "done",
			ruleIndex,
			detail: payoutDetail,
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
	validatorAddress?: Address;
}): Promise<Pick<SettlementRuleUpdateInput, "updateRuleTxHash">> {
	const validator = paymentValidatorAt(args.contracts, args.validatorAddress);
	if (!validator) {
		throw new Error(
			"FSPaymentValidator is not deployed on this chain. Run contracts deploy/migrate first.",
		);
	}

	assertSettlementLegs(args.legs);

	const expiresAt = args.expiresAt ?? 0n;
	const { specificSignerCommitment, thresholdN, signerCommitments } =
		releaseParamsToContractArgs(args.releaseType, args.releaseParams);
	const contractLegs = toContractPayoutLegs(args.legs);
	const updateArgs = [
		BigInt(args.onChainRuleId),
		releaseTypeToUint8(args.releaseType),
		specificSignerCommitment,
		thresholdN,
		expiresAt,
		signerCommitments,
		contractLegs,
	] as const;

	const data = encodeFunctionData({
		abi: validator.abi,
		functionName: "updatePayoutRule",
		args: [...updateArgs],
	});

	await simulateSettlementWrite({
		contracts: args.contracts,
		wallet: args.wallet,
		address: validator.address,
		abi: validator.abi,
		functionName: "updatePayoutRule",
		args: updateArgs,
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
	validatorAddress?: Address;
}): Promise<Pick<SettlementRuleCancelInput, "cancelRuleTxHash">> {
	const validator = paymentValidatorAt(args.contracts, args.validatorAddress);
	if (!validator) {
		throw new Error(
			"FSPaymentValidator is not deployed on this chain. Run contracts deploy/migrate first.",
		);
	}

	const ruleId = BigInt(args.onChainRuleId);
	const data = encodeFunctionData({
		abi: validator.abi,
		functionName: "cancelPayoutRule",
		args: [ruleId],
	});

	await simulateSettlementWrite({
		contracts: args.contracts,
		wallet: args.wallet,
		address: validator.address,
		abi: validator.abi,
		functionName: "cancelPayoutRule",
		args: [ruleId],
	});

	const cancelRuleTxHash = await args.wallet.sendTransaction({
		to: validator.address,
		data,
		account: args.wallet.account,
		chain: args.wallet.chain,
	});

	return { cancelRuleTxHash };
}

async function listUnpaidSettlementLegIndicesOnChain(args: {
	validator: NonNullable<ReturnType<typeof paymentValidatorAt>>;
	onChainRuleId: bigint;
}): Promise<number[]> {
	const legs = await args.validator.read.ruleLegs([args.onChainRuleId]);
	const unpaid: number[] = [];
	for (let i = 0; i < legs.length; i++) {
		const paid = await args.validator.read.isLegPaid([
			args.onChainRuleId,
			BigInt(i),
		]);
		if (!paid) unpaid.push(i);
	}
	return unpaid;
}

export async function executeSettlementPayoutLegOnChain(args: {
	wallet: FilosignWallet;
	contracts: FilosignContracts;
	onChainRuleId: string;
	legIndex: number;
	validatorAddress?: Address;
}): Promise<Hex> {
	const validator = paymentValidatorAt(args.contracts, args.validatorAddress);
	if (!validator) {
		throw new Error(
			"FSPaymentValidator is not deployed on this chain. Run contracts deploy/migrate first.",
		);
	}

	const ruleId = BigInt(args.onChainRuleId);
	const legIdx = BigInt(args.legIndex);

	await simulateSettlementWrite({
		contracts: args.contracts,
		wallet: args.wallet,
		address: validator.address,
		abi: validator.abi,
		functionName: "executePayoutLeg",
		args: [ruleId, legIdx],
	});

	const data = encodeFunctionData({
		abi: validator.abi,
		functionName: "executePayoutLeg",
		args: [ruleId, legIdx],
	});

	return args.wallet.sendTransaction({
		to: validator.address,
		data,
		account: args.wallet.account,
		chain: args.wallet.chain,
	});
}

/** Pays each unpaid leg in separate transactions; returns the last payout tx hash. */
export async function executeSettlementPayoutOnChain(args: {
	wallet: FilosignWallet;
	contracts: FilosignContracts;
	onChainRuleId: string;
	validatorAddress?: Address;
}): Promise<Hex> {
	const validator = paymentValidatorAt(args.contracts, args.validatorAddress);
	if (!validator) {
		throw new Error(
			"FSPaymentValidator is not deployed on this chain. Run contracts deploy/migrate first.",
		);
	}

	const ruleId = BigInt(args.onChainRuleId);
	const unpaid = await listUnpaidSettlementLegIndicesOnChain({
		validator,
		onChainRuleId: ruleId,
	});
	if (unpaid.length === 0) {
		throw new Error("Payout packet has no unpaid legs on-chain.");
	}

	let lastHash: Hex | undefined;
	for (const legIndex of unpaid) {
		lastHash = await executeSettlementPayoutLegOnChain({
			...args,
			legIndex,
		});
	}
	return lastHash as Hex;
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

	const approveAbi = erc20ApproveAbi(args.chainKey);
	const approveArgs = [validator.address, 0n] as const;
	const data = encodeFunctionData({
		abi: approveAbi,
		functionName: "approve",
		args: [...approveArgs],
	});

	await simulateSettlementWrite({
		contracts: args.contracts,
		wallet: args.wallet,
		address: args.tokenAddress,
		abi: approveAbi,
		functionName: "approve",
		args: approveArgs,
	});

	return args.wallet.sendTransaction({
		to: args.tokenAddress,
		data,
		account: args.wallet.account,
		chain: args.wallet.chain,
	});
}
