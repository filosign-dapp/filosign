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
	settlementAllowanceRequired,
} from "@filosign/shared";
import {
	type Address,
	createPublicClient,
	encodeFunctionData,
	getAddress,
	getContract,
	type Hex,
	http,
} from "viem";
import type { SendFileProgressReporter } from "./send-file/progress";
import { emitSendFileProgress } from "./send-file/progress";
import {
	paymentValidatorAt,
	simulateSettlementWrite,
} from "./settlement-preflight";
import {
	buildSettlementApproveCall,
	buildSettlementRegisterRuleCall,
	buildSettlementRuleRegistrationRecord,
	settlementRuleApprovalTotal,
} from "./settlement-rule-tx";
import type { SettlementRuleRow } from "./settlement-types";
import { waitForTxReceipt } from "./tx-receipt";
import type { FilosignWallet } from "./wallet";

export type SettlementRuleDraftLeg = {
	recipientWallet: Address;
	recipientSource: SettlementRecipientSource;
	amount: bigint;
};

export type SettlementChangeProgressPhase =
	| "approve"
	| "update"
	| "sync_approval"
	| "cancel";

export type SettlementChangeProgressStatus = "start" | "confirming" | "done";

export type SettlementChangeProgressEvent = {
	phase: SettlementChangeProgressPhase;
	status: SettlementChangeProgressStatus;
};

export type SettlementChangeProgressReporter = (
	event: SettlementChangeProgressEvent,
) => void;

function emitSettlementChangeProgress(
	onProgress: SettlementChangeProgressReporter | undefined,
	event: SettlementChangeProgressEvent,
): void {
	onProgress?.(event);
}

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

function publicClientFor(contracts: FilosignContracts) {
	const chain = contracts.$client.chain;
	if (!chain) {
		throw new Error(
			"Chain config missing from Filosign contracts client; cannot read settlement allowance",
		);
	}
	return createPublicClient({ chain, transport: http() });
}

function toAllowanceRuleInputs(
	rules: readonly SettlementRuleRow[],
): Parameters<typeof settlementAllowanceRequired>[0] {
	return rules.map((rule) => ({
		onChainRuleId: rule.onChainRuleId,
		validatorAddress: rule.validatorAddress,
		tokenAddress: rule.tokenAddress,
		status: rule.status,
		legs: rule.legs,
	}));
}

export type SettlementPayerWalletResolver = (args: {
	payer: Address;
}) => Promise<FilosignWallet>;

export function settlementRulePayerAddress(
	rule: SettlementRuleRow,
	fallback: Address,
): Address {
	const payer = rule.payerWallet;
	if (typeof payer === "string" && payer.startsWith("0x")) {
		return getAddress(payer);
	}
	return getAddress(fallback);
}

async function resolveSettlementApprovalWallet(args: {
	payer: Address;
	connectedWallet: FilosignWallet;
	resolvePayerWallet?: SettlementPayerWalletResolver;
}): Promise<FilosignWallet> {
	if (
		args.payer.toLowerCase() ===
		args.connectedWallet.account.address.toLowerCase()
	) {
		return args.connectedWallet;
	}
	if (!args.resolvePayerWallet) {
		throw new Error(
			"This payout uses the workspace treasury. Connect your treasury wallet to continue.",
		);
	}
	return args.resolvePayerWallet({ payer: args.payer });
}

export async function readSettlementValidatorAllowance(args: {
	contracts: FilosignContracts;
	chainKey: ChainKey;
	tokenAddress: Address;
	payer: Address;
	validatorAddress?: Address;
}): Promise<bigint> {
	const validator = paymentValidatorAt(args.contracts, args.validatorAddress);
	if (!validator) {
		throw new Error(
			"FSPaymentValidator is not deployed on this chain. Run contracts deploy/migrate first.",
		);
	}

	const approveAbi = erc20ApproveAbi(args.chainKey);
	const client = publicClientFor(args.contracts);
	const token = getContract({
		address: args.tokenAddress,
		abi: approveAbi,
		client,
	});

	return (await token.read.allowance([
		args.payer,
		validator.address,
	])) as bigint;
}

export async function approveSettlementValidatorAllowance(args: {
	wallet: FilosignWallet;
	contracts: FilosignContracts;
	chainKey: ChainKey;
	tokenAddress: Address;
	amount: bigint;
	validatorAddress?: Address;
	txLabel?: string;
	onSent?: () => void;
}): Promise<Hex> {
	const validator = paymentValidatorAt(args.contracts, args.validatorAddress);
	if (!validator) {
		throw new Error(
			"FSPaymentValidator is not deployed on this chain. Run contracts deploy/migrate first.",
		);
	}

	const approveAbi = erc20ApproveAbi(args.chainKey);
	const approveArgs = [validator.address, args.amount] as const;
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

	const approveHash = await args.wallet.sendTransaction({
		to: args.tokenAddress,
		data,
		account: args.wallet.account,
		chain: args.wallet.chain,
	});
	args.onSent?.();
	await waitForTxReceipt(args.contracts, approveHash, {
		label: args.txLabel ?? "USDC approval",
		abi: approveAbi,
	});
	return approveHash;
}

/** Sets ERC-20 allowance to `required` when it differs from the current value. */
export async function ensureSettlementValidatorAllowance(args: {
	wallet: FilosignWallet;
	contracts: FilosignContracts;
	chainKey: ChainKey;
	tokenAddress: Address;
	validatorAddress: Address;
	payer: Address;
	required: bigint;
}): Promise<Hex | undefined> {
	const current = await readSettlementValidatorAllowance({
		contracts: args.contracts,
		chainKey: args.chainKey,
		tokenAddress: args.tokenAddress,
		payer: args.payer,
		validatorAddress: args.validatorAddress,
	});
	if (current === args.required) return undefined;

	return approveSettlementValidatorAllowance({
		wallet: args.wallet,
		contracts: args.contracts,
		chainKey: args.chainKey,
		tokenAddress: args.tokenAddress,
		amount: args.required,
		validatorAddress: args.validatorAddress,
	});
}

async function approveAllowanceWithProgress(args: {
	wallet: FilosignWallet;
	contracts: FilosignContracts;
	chainKey: ChainKey;
	tokenAddress: Address;
	validatorAddress: Address;
	amount: bigint;
	phase: Extract<SettlementChangeProgressPhase, "approve" | "sync_approval">;
	onProgress?: SettlementChangeProgressReporter;
	txLabel?: string;
}): Promise<Hex> {
	emitSettlementChangeProgress(args.onProgress, {
		phase: args.phase,
		status: "start",
	});

	const approveHash = await approveSettlementValidatorAllowance({
		wallet: args.wallet,
		contracts: args.contracts,
		chainKey: args.chainKey,
		tokenAddress: args.tokenAddress,
		amount: args.amount,
		validatorAddress: args.validatorAddress,
		txLabel: args.txLabel,
		onSent: () => {
			emitSettlementChangeProgress(args.onProgress, {
				phase: args.phase,
				status: "confirming",
			});
		},
	});

	emitSettlementChangeProgress(args.onProgress, {
		phase: args.phase,
		status: "done",
	});

	return approveHash;
}

async function trimSettlementValidatorAllowance(args: {
	wallet: FilosignWallet;
	contracts: FilosignContracts;
	chainKey: ChainKey;
	tokenAddress: Address;
	validatorAddress: Address;
	payer: Address;
	required: bigint;
	onProgress?: SettlementChangeProgressReporter;
}): Promise<Hex | undefined> {
	const current = await readSettlementValidatorAllowance({
		contracts: args.contracts,
		chainKey: args.chainKey,
		tokenAddress: args.tokenAddress,
		payer: args.payer,
		validatorAddress: args.validatorAddress,
	});
	if (current <= args.required) return undefined;

	return approveAllowanceWithProgress({
		wallet: args.wallet,
		contracts: args.contracts,
		chainKey: args.chainKey,
		tokenAddress: args.tokenAddress,
		validatorAddress: args.validatorAddress,
		amount: args.required,
		phase: "sync_approval",
		onProgress: args.onProgress,
		txLabel: "USDC approval update",
	});
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
	let cumulativeApproved = 0n;

	for (let ruleIndex = 0; ruleIndex < args.rules.length; ruleIndex++) {
		const rule = args.rules[ruleIndex];
		if (!rule) continue;
		const payoutDetail =
			ruleCount > 1 ? `Payout ${ruleIndex + 1} of ${ruleCount}` : undefined;

		assertSettlementLegs(rule.legs);
		const totalAmount = settlementRuleApprovalTotal(rule.legs);
		const expiresAt = rule.expiresAt ?? 0n;
		const releaseArgs = releaseParamsToContractArgs(
			rule.releaseType,
			rule.releaseParams,
		);
		cumulativeApproved += totalAmount;

		const approveCall = buildSettlementApproveCall({
			chainKey: args.chainKey,
			tokenAddress: rule.tokenAddress,
			validatorAddress: validator.address,
			cumulativeApproved,
		});

		const registerCall = buildSettlementRegisterRuleCall({
			validatorAbi,
			validatorAddress: validator.address,
			payer: args.payer,
			rule,
			cidIdentifier: args.cidIdentifier,
		});

		await simulateSettlementWrite({
			contracts: args.contracts,
			wallet: args.wallet,
			address: approveCall.to,
			abi: approveAbi,
			functionName: "approve",
			args: [validator.address, cumulativeApproved],
		});

		emitSendFileProgress(args.onProgress, {
			phase: "wallet_payout_approve",
			status: "wallet_prompt",
			ruleIndex,
			detail: payoutDetail,
		});

		const approveHash = await args.wallet.sendTransaction({
			to: approveCall.to,
			data: approveCall.data,
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
		await waitForTxReceipt(args.contracts, approveHash, {
			label: "USDC approval",
			abi: approveAbi,
		});
		emitSendFileProgress(args.onProgress, {
			phase: "wallet_payout_approve",
			status: "done",
			ruleIndex,
			detail: payoutDetail,
		});

		await simulateSettlementWrite({
			contracts: args.contracts,
			wallet: args.wallet,
			address: registerCall.to,
			abi: validatorAbi,
			functionName: "registerRule",
			args: [
				args.payer,
				rule.tokenAddress,
				args.cidIdentifier,
				releaseTypeToUint8(rule.releaseType),
				releaseArgs.specificSignerCommitment,
				releaseArgs.thresholdN,
				expiresAt,
				releaseArgs.signerCommitments,
				rule.legs.map((leg) => ({
					recipient: leg.recipientWallet,
					amount: leg.amount,
				})),
			],
		});

		emitSendFileProgress(args.onProgress, {
			phase: "wallet_payout_register",
			status: "wallet_prompt",
			ruleIndex,
			detail: payoutDetail,
		});

		const registerHash = await args.wallet.sendTransaction({
			to: registerCall.to,
			data: registerCall.data,
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
			{
				label: "Payout registration",
				abi: validatorAbi,
			},
		);

		registered.push(
			buildSettlementRuleRegistrationRecord({
				rule,
				cidIdentifier: args.cidIdentifier,
				validatorAddress: validator.address,
				validatorAbi,
				registerReceipt,
				registerRuleTxHash: registerHash,
				approveTxHash: approveHash,
			}),
		);

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
	chainKey: ChainKey;
	allRules: readonly SettlementRuleRow[];
	onChainRuleId: string;
	releaseType: SettlementReleaseType;
	releaseParams: SettlementRuleDraft["releaseParams"];
	legs: SettlementRuleDraftLeg[];
	expiresAt?: bigint;
	validatorAddress?: Address;
	onProgress?: SettlementChangeProgressReporter;
	resolvePayerWallet?: SettlementPayerWalletResolver;
}): Promise<{
	updateRuleTxHash: SettlementRuleUpdateInput["updateRuleTxHash"];
	approveTxHashes: Hex[];
}> {
	const validator = paymentValidatorAt(args.contracts, args.validatorAddress);
	if (!validator) {
		throw new Error(
			"FSPaymentValidator is not deployed on this chain. Run contracts deploy/migrate first.",
		);
	}

	assertSettlementLegs(args.legs);

	const targetRule = args.allRules.find(
		(rule) => rule.onChainRuleId === args.onChainRuleId,
	);
	if (!targetRule) {
		throw new Error("Settlement rule not found for allowance sync.");
	}

	const allowanceOpts = {
		tokenAddress: getAddress(targetRule.tokenAddress),
		validatorAddress: validator.address,
	};
	const registrationLegs = toRegistrationLegs(args.legs);
	const requiredAfter = settlementAllowanceRequired(
		toAllowanceRuleInputs(args.allRules),
		{
			...allowanceOpts,
			replaceRuleId: args.onChainRuleId,
			legs: registrationLegs,
		},
	);

	const payer = settlementRulePayerAddress(
		targetRule,
		args.wallet.account.address,
	);
	const approvalWallet = await resolveSettlementApprovalWallet({
		payer,
		connectedWallet: args.wallet,
		resolvePayerWallet: args.resolvePayerWallet,
	});
	const approveTxHashes: Hex[] = [];
	const currentAllowance = await readSettlementValidatorAllowance({
		contracts: args.contracts,
		chainKey: args.chainKey,
		tokenAddress: getAddress(targetRule.tokenAddress),
		payer,
		validatorAddress: validator.address,
	});

	if (currentAllowance < requiredAfter) {
		const preApprove = await approveAllowanceWithProgress({
			wallet: approvalWallet,
			contracts: args.contracts,
			chainKey: args.chainKey,
			tokenAddress: getAddress(targetRule.tokenAddress),
			validatorAddress: validator.address,
			amount: requiredAfter,
			phase: "approve",
			onProgress: args.onProgress,
		});
		approveTxHashes.push(preApprove);
	}

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

	emitSettlementChangeProgress(args.onProgress, {
		phase: "update",
		status: "start",
	});

	const updateRuleTxHash = await args.wallet.sendTransaction({
		to: validator.address,
		data,
		account: args.wallet.account,
		chain: args.wallet.chain,
	});
	emitSettlementChangeProgress(args.onProgress, {
		phase: "update",
		status: "confirming",
	});
	await waitForTxReceipt(args.contracts, updateRuleTxHash, {
		label: "Payout update",
		abi: validator.abi,
	});
	emitSettlementChangeProgress(args.onProgress, {
		phase: "update",
		status: "done",
	});

	const postTrim = await trimSettlementValidatorAllowance({
		wallet: approvalWallet,
		contracts: args.contracts,
		chainKey: args.chainKey,
		tokenAddress: getAddress(targetRule.tokenAddress),
		validatorAddress: validator.address,
		payer,
		required: requiredAfter,
		onProgress: args.onProgress,
	});
	if (postTrim) approveTxHashes.push(postTrim);

	return { updateRuleTxHash, approveTxHashes };
}

export async function cancelSettlementRuleOnChain(args: {
	wallet: FilosignWallet;
	contracts: FilosignContracts;
	chainKey: ChainKey;
	allRules: readonly SettlementRuleRow[];
	onChainRuleId: string;
	validatorAddress?: Address;
	onProgress?: SettlementChangeProgressReporter;
	resolvePayerWallet?: SettlementPayerWalletResolver;
}): Promise<{
	cancelRuleTxHash: SettlementRuleCancelInput["cancelRuleTxHash"];
	approveTxHashes: Hex[];
}> {
	const validator = paymentValidatorAt(args.contracts, args.validatorAddress);
	if (!validator) {
		throw new Error(
			"FSPaymentValidator is not deployed on this chain. Run contracts deploy/migrate first.",
		);
	}

	const targetRule = args.allRules.find(
		(rule) => rule.onChainRuleId === args.onChainRuleId,
	);
	if (!targetRule) {
		throw new Error("Settlement rule not found for allowance sync.");
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

	emitSettlementChangeProgress(args.onProgress, {
		phase: "cancel",
		status: "start",
	});

	const cancelRuleTxHash = await args.wallet.sendTransaction({
		to: validator.address,
		data,
		account: args.wallet.account,
		chain: args.wallet.chain,
	});
	emitSettlementChangeProgress(args.onProgress, {
		phase: "cancel",
		status: "confirming",
	});
	await waitForTxReceipt(args.contracts, cancelRuleTxHash, {
		label: "Payout removal",
		abi: validator.abi,
	});
	emitSettlementChangeProgress(args.onProgress, {
		phase: "cancel",
		status: "done",
	});

	const requiredAfter = settlementAllowanceRequired(
		toAllowanceRuleInputs(args.allRules),
		{
			tokenAddress: getAddress(targetRule.tokenAddress),
			validatorAddress: validator.address,
			excludeRuleId: args.onChainRuleId,
		},
	);

	const approveTxHashes: Hex[] = [];
	const payer = settlementRulePayerAddress(
		targetRule,
		args.wallet.account.address,
	);
	const approvalWallet = await resolveSettlementApprovalWallet({
		payer,
		connectedWallet: args.wallet,
		resolvePayerWallet: args.resolvePayerWallet,
	});
	const trimHash = await trimSettlementValidatorAllowance({
		wallet: approvalWallet,
		contracts: args.contracts,
		chainKey: args.chainKey,
		tokenAddress: getAddress(targetRule.tokenAddress),
		validatorAddress: validator.address,
		payer,
		required: requiredAfter,
		onProgress: args.onProgress,
	});
	if (trimHash) approveTxHashes.push(trimHash);

	return { cancelRuleTxHash, approveTxHashes };
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
	payer: Address;
	validatorAddress?: Address;
	resolvePayerWallet?: SettlementPayerWalletResolver;
}): Promise<Hex> {
	const validator = paymentValidatorAt(args.contracts, args.validatorAddress);
	if (!validator) {
		throw new Error(
			"FSPaymentValidator is not deployed on this chain. Run contracts deploy/migrate first.",
		);
	}

	const approvalWallet = await resolveSettlementApprovalWallet({
		payer: args.payer,
		connectedWallet: args.wallet,
		resolvePayerWallet: args.resolvePayerWallet,
	});

	const approveAbi = erc20ApproveAbi(args.chainKey);
	const approveArgs = [validator.address, 0n] as const;
	const data = encodeFunctionData({
		abi: approveAbi,
		functionName: "approve",
		args: [...approveArgs],
	});

	await simulateSettlementWrite({
		contracts: args.contracts,
		wallet: approvalWallet,
		address: args.tokenAddress,
		abi: approveAbi,
		functionName: "approve",
		args: approveArgs,
	});

	const approveHash = await approvalWallet.sendTransaction({
		to: args.tokenAddress,
		data,
		account: approvalWallet.account,
		chain: approvalWallet.chain,
	});
	await waitForTxReceipt(args.contracts, approveHash, {
		label: "USDC approval revoke",
		abi: approveAbi,
	});
	return approveHash;
}
