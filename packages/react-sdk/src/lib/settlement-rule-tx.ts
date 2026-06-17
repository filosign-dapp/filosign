import type { FilosignContracts } from "@filosign/evm";
import { type ChainKey, getContractAbi } from "@filosign/evm";
import type { SettlementRuleRegistrationInput } from "@filosign/shared";
import {
	SETTLEMENT_RELEASE_TYPE_UINT,
	settlementRuleTotalAmount,
} from "@filosign/shared";
import {
	type Abi,
	type Address,
	encodeFunctionData,
	type Hex,
	type Log,
	parseEventLogs,
	type TransactionReceipt,
} from "viem";
import {
	releaseParamsToContractArgs,
	type SettlementRuleDraft,
	type SettlementRuleDraftLeg,
} from "./settlement-rules";
import { parseRuleIdFromReceipt } from "./tx-receipt";

export type SettlementEncodedCall = {
	to: Address;
	data: Hex;
};

function erc20ApproveAbi(chainKey: ChainKey): Abi {
	try {
		return getContractAbi("MockUSDC", chainKey);
	} catch {
		return getContractAbi("MockUSDC", "local");
	}
}

function toContractPayoutLegs(legs: SettlementRuleDraftLeg[]) {
	return legs.map((leg) => ({
		recipient: leg.recipientWallet,
		amount: leg.amount,
	}));
}

function toRegistrationLegs(legs: SettlementRuleDraftLeg[]) {
	return legs.map((leg) => ({
		recipientWallet: leg.recipientWallet,
		recipientSource: leg.recipientSource,
		amount: leg.amount.toString(),
	}));
}

export function settlementRuleApprovalTotal(
	legs: SettlementRuleDraftLeg[],
): bigint {
	return settlementRuleTotalAmount(
		legs.map((leg) => ({ amount: leg.amount.toString() })),
	);
}

export function buildSettlementApproveCall(args: {
	chainKey: ChainKey;
	tokenAddress: Address;
	validatorAddress: Address;
	cumulativeApproved: bigint;
}): SettlementEncodedCall {
	const approveAbi = erc20ApproveAbi(args.chainKey);
	return {
		to: args.tokenAddress,
		data: encodeFunctionData({
			abi: approveAbi,
			functionName: "approve",
			args: [args.validatorAddress, args.cumulativeApproved],
		}),
	};
}

export function buildSettlementRegisterRuleCall(args: {
	validatorAbi: Abi;
	validatorAddress: Address;
	payer: Address;
	rule: SettlementRuleDraft;
	cidIdentifier: Hex;
}): SettlementEncodedCall {
	const expiresAt = args.rule.expiresAt ?? 0n;
	const { specificSignerCommitment, thresholdN, signerCommitments } =
		releaseParamsToContractArgs(args.rule.releaseType, args.rule.releaseParams);
	const contractLegs = toContractPayoutLegs(args.rule.legs);

	return {
		to: args.validatorAddress,
		data: encodeFunctionData({
			abi: args.validatorAbi,
			functionName: "registerRule",
			args: [
				args.payer,
				args.rule.tokenAddress,
				args.cidIdentifier,
				SETTLEMENT_RELEASE_TYPE_UINT[args.rule.releaseType],
				specificSignerCommitment,
				thresholdN,
				expiresAt,
				signerCommitments,
				contractLegs,
			],
		}),
	};
}

export function buildSettlementRuleRegistrationRecord(args: {
	rule: SettlementRuleDraft;
	cidIdentifier: Hex;
	validatorAddress: Address;
	validatorAbi: Abi;
	registerReceipt: TransactionReceipt;
	registerRuleTxHash: Hex;
	approveTxHash: Hex;
}): SettlementRuleRegistrationInput {
	const expiresAt = args.rule.expiresAt ?? 0n;
	const onChainRuleId = parseSettlementRuleIdFromReceipt({
		receipt: args.registerReceipt,
		emitter: args.validatorAddress,
		abi: args.validatorAbi,
	});

	return {
		onChainRuleId,
		legs: toRegistrationLegs(args.rule.legs),
		tokenAddress: args.rule.tokenAddress,
		cidIdentifier: args.cidIdentifier,
		releaseType: args.rule.releaseType,
		releaseParams: args.rule.releaseParams,
		expiresAt: expiresAt === 0n ? undefined : expiresAt.toString(),
		registerRuleTxHash: args.registerRuleTxHash,
		approveTxHash: args.approveTxHash,
	};
}

export function parseSettlementRuleIdFromReceipt(args: {
	receipt: TransactionReceipt;
	emitter: Address;
	abi: Abi;
}): string {
	return parseRuleIdFromReceipt({
		receipt: args.receipt,
		emitter: args.emitter,
		abi: args.abi,
		eventName: "PaymentRuleRegistered",
	});
}

export function parseSettlementRuleIdsFromReceipt(args: {
	receipt: TransactionReceipt;
	emitter: Address;
	abi: Abi;
}): string[] {
	const parsed = parseEventLogs({
		abi: args.abi,
		logs: [...args.receipt.logs] as Log[],
		eventName: "PaymentRuleRegistered",
	});
	const emitter = args.emitter.toLowerCase();
	return parsed
		.filter(
			(log) =>
				log.eventName === "PaymentRuleRegistered" &&
				log.address.toLowerCase() === emitter,
		)
		.map((log) => (log.args as { ruleId: bigint }).ruleId.toString(10));
}

export function buildSettlementRegistrationCalls(args: {
	chainKey: ChainKey;
	contracts: FilosignContracts;
	payer: Address;
	cidIdentifier: Hex;
	rules: SettlementRuleDraft[];
}): SettlementEncodedCall[] {
	const validator = args.contracts.FSPaymentValidator;
	if (!validator) {
		throw new Error(
			"FSPaymentValidator is not deployed on this chain. Run contracts deploy/migrate first.",
		);
	}

	const calls: SettlementEncodedCall[] = [];
	let cumulativeApproved = 0n;

	for (const rule of args.rules) {
		const totalAmount = settlementRuleApprovalTotal(rule.legs);
		cumulativeApproved += totalAmount;
		calls.push(
			buildSettlementApproveCall({
				chainKey: args.chainKey,
				tokenAddress: rule.tokenAddress,
				validatorAddress: validator.address,
				cumulativeApproved,
			}),
		);
		calls.push(
			buildSettlementRegisterRuleCall({
				validatorAbi: validator.abi,
				validatorAddress: validator.address,
				payer: args.payer,
				rule,
				cidIdentifier: args.cidIdentifier,
			}),
		);
	}

	return calls;
}
