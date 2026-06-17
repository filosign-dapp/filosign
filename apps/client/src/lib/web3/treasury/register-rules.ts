import type { ChainKey, FilosignContracts } from "@filosign/evm";
import {
	buildSettlementRegistrationCalls,
	buildSettlementRuleRegistrationRecord,
	emitSendFileProgress,
	filosignPublicClient,
	parseSettlementRuleIdsFromReceipt,
	type SendFileProgressReporter,
	type SettlementRuleDraft,
	waitForTxReceipt,
} from "@filosign/react/files";
import type { SettlementRuleRegistrationInput } from "@filosign/shared";
import { type Address, createWalletClient, custom, type Hex } from "viem";
import { treasuryChain } from "@/src/lib/web3/treasury/chain";
import { treasuryEip1193Provider } from "@/src/lib/web3/treasury/provider";
import {
	createTreasuryPublicClient,
	detectTreasuryWalletKind,
} from "@/src/lib/web3/treasury/safe-detect";
import {
	createSafeApiKit,
	createSafeProtocolKit,
	pollSafeTransactionExecution,
} from "@/src/lib/web3/treasury/safe-kit";
import { connectTreasuryWalletSession } from "@/src/lib/web3/treasury/session";

async function registerTreasuryEoaRules(args: {
	payer: Address;
	cidIdentifier: Hex;
	rules: SettlementRuleDraft[];
	contracts: FilosignContracts;
	chainKey: ChainKey;
	onProgress?: SendFileProgressReporter;
}): Promise<SettlementRuleRegistrationInput[]> {
	const session = await connectTreasuryWalletSession();
	try {
		if (session.address.toLowerCase() !== args.payer.toLowerCase()) {
			throw new Error(
				"Connected treasury wallet does not match the selected workspace treasury.",
			);
		}

		const validator = args.contracts.FSPaymentValidator;
		if (!validator) {
			throw new Error("FSPaymentValidator is not deployed on this chain.");
		}

		const calls = buildSettlementRegistrationCalls({
			chainKey: args.chainKey,
			contracts: args.contracts,
			payer: args.payer,
			cidIdentifier: args.cidIdentifier,
			rules: args.rules,
		});

		const provider = await treasuryEip1193Provider();
		const wallet = createWalletClient({
			account: session.address,
			chain: treasuryChain(),
			transport: custom(provider),
		});

		const registered: SettlementRuleRegistrationInput[] = [];
		let ruleIndex = 0;

		for (let i = 0; i < calls.length; i += 2) {
			const approveCall = calls[i];
			const registerCall = calls[i + 1];
			const rule = args.rules[ruleIndex];
			if (!approveCall || !registerCall || !rule) continue;

			const payoutDetail =
				args.rules.length > 1
					? `Payout ${ruleIndex + 1} of ${args.rules.length}`
					: undefined;

			emitSendFileProgress(args.onProgress, {
				phase: "wallet_payout_approve",
				status: "wallet_prompt",
				ruleIndex,
				detail: payoutDetail,
			});

			const approveTxHash = await wallet.sendTransaction({
				account: session.address,
				chain: treasuryChain(),
				to: approveCall.to,
				data: approveCall.data,
			});

			emitSendFileProgress(args.onProgress, {
				phase: "confirming_transaction",
				status: "confirming",
				ruleIndex,
				detail: payoutDetail,
				txLabel: "USDC approval",
			});
			await waitForTxReceipt(args.contracts, approveTxHash);
			emitSendFileProgress(args.onProgress, {
				phase: "wallet_payout_approve",
				status: "done",
				ruleIndex,
				detail: payoutDetail,
			});

			emitSendFileProgress(args.onProgress, {
				phase: "wallet_payout_register",
				status: "wallet_prompt",
				ruleIndex,
				detail: payoutDetail,
			});

			const registerTxHash = await wallet.sendTransaction({
				account: session.address,
				chain: treasuryChain(),
				to: registerCall.to,
				data: registerCall.data,
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
				registerTxHash,
				{ abi: validator.abi },
			);
			emitSendFileProgress(args.onProgress, {
				phase: "wallet_payout_register",
				status: "done",
				ruleIndex,
				detail: payoutDetail,
			});

			registered.push(
				buildSettlementRuleRegistrationRecord({
					rule,
					cidIdentifier: args.cidIdentifier,
					validatorAddress: validator.address,
					validatorAbi: validator.abi,
					registerReceipt,
					registerRuleTxHash: registerTxHash,
					approveTxHash: approveTxHash,
				}),
			);
			ruleIndex += 1;
		}

		return registered;
	} finally {
		await session.disconnect();
	}
}

async function registerTreasurySafeRules(args: {
	payer: Address;
	cidIdentifier: Hex;
	rules: SettlementRuleDraft[];
	contracts: FilosignContracts;
	chainKey: ChainKey;
	onProgress?: SendFileProgressReporter;
}): Promise<SettlementRuleRegistrationInput[]> {
	const validator = args.contracts.FSPaymentValidator;
	if (!validator) {
		throw new Error("FSPaymentValidator is not deployed on this chain.");
	}

	const session = await connectTreasuryWalletSession();
	try {
		const provider = await treasuryEip1193Provider();
		const protocolKit = await createSafeProtocolKit({
			safeAddress: args.payer,
			provider,
		});

		const calls = buildSettlementRegistrationCalls({
			chainKey: args.chainKey,
			contracts: args.contracts,
			payer: args.payer,
			cidIdentifier: args.cidIdentifier,
			rules: args.rules,
		});

		const metaTransactions = calls.map((call) => ({
			to: call.to,
			value: "0",
			data: call.data,
		}));

		emitSendFileProgress(args.onProgress, {
			phase: "treasury_safe_propose",
			status: "wallet_prompt",
		});

		const safeTransaction = await protocolKit.createTransaction({
			transactions: metaTransactions,
			onlyCalls: true,
		});
		const signedTx = await protocolKit.signTransaction(safeTransaction);
		const safeTxHash = await protocolKit.getTransactionHash(signedTx);
		const signature = signedTx.signatures.values().next().value?.data ?? "0x";
		const apiKit = await createSafeApiKit();

		await apiKit.proposeTransaction({
			safeAddress: args.payer,
			safeTransactionData: signedTx.data,
			safeTxHash,
			senderAddress: session.address,
			senderSignature: signature,
			origin: "Filosign treasury payout registration",
		});

		emitSendFileProgress(args.onProgress, {
			phase: "treasury_safe_pending",
			status: "confirming",
			detail: "Waiting for treasury Safe signatures and execution.",
		});

		let transactionHash: Hex;
		try {
			const executed = await pollSafeTransactionExecution({ safeTxHash });
			transactionHash = executed.transactionHash;
		} catch {
			const executable = await protocolKit.isValidTransaction(signedTx);
			if (!executable) {
				throw new Error(
					"Treasury Safe transaction is not ready to execute. Collect remaining signatures in Safe, then retry send.",
				);
			}
			const result = await protocolKit.executeTransaction(signedTx);
			transactionHash = result.hash as Hex;
		}

		emitSendFileProgress(args.onProgress, {
			phase: "treasury_safe_executed",
			status: "done",
		});

		const client = filosignPublicClient(args.contracts);
		const receipt = await client.waitForTransactionReceipt({
			hash: transactionHash,
		});

		const ruleIds = parseSettlementRuleIdsFromReceipt({
			receipt,
			emitter: validator.address,
			abi: validator.abi,
		});
		if (ruleIds.length !== args.rules.length) {
			throw new Error(
				"Treasury Safe batch executed but payout rule IDs could not be parsed for every rule.",
			);
		}

		return args.rules.map((rule, index) => {
			const onChainRuleId = ruleIds[index];
			if (!onChainRuleId) {
				throw new Error("Missing on-chain rule id for treasury Safe batch.");
			}
			const expiresAt = rule.expiresAt ?? 0n;
			return {
				onChainRuleId,
				legs: rule.legs.map((leg) => ({
					recipientWallet: leg.recipientWallet,
					recipientSource: leg.recipientSource,
					amount: leg.amount.toString(),
				})),
				tokenAddress: rule.tokenAddress,
				cidIdentifier: args.cidIdentifier,
				releaseType: rule.releaseType,
				releaseParams: rule.releaseParams,
				expiresAt: expiresAt === 0n ? undefined : expiresAt.toString(),
				registerRuleTxHash: transactionHash,
				approveTxHash: transactionHash,
			};
		});
	} finally {
		await session.disconnect();
	}
}

export function createTreasurySettlementRegistrar(args: {
	contracts: FilosignContracts;
	chainKey: ChainKey;
}) {
	return async (input: {
		payer: Address;
		cidIdentifier: Hex;
		rules: SettlementRuleDraft[];
		onProgress?: SendFileProgressReporter;
	}): Promise<SettlementRuleRegistrationInput[]> => {
		const client = createTreasuryPublicClient();
		const kind = await detectTreasuryWalletKind(input.payer, client);
		if (kind === "safe") {
			return registerTreasurySafeRules({
				...input,
				contracts: args.contracts,
				chainKey: args.chainKey,
			});
		}
		return registerTreasuryEoaRules({
			...input,
			contracts: args.contracts,
			chainKey: args.chainKey,
		});
	};
}
