import type { FilosignContracts } from "@filosign/contracts";
import {
	type Abi,
	type AbiStateMutability,
	type Address,
	BaseError,
	ContractFunctionRevertedError,
	createPublicClient,
	getAddress,
	getContract,
	http,
} from "viem";
import type { FilosignWallet } from "./wallet";

const SETTLEMENT_REVERT_MESSAGES: Record<string, string> = {
	RuleNotExecutable:
		"This payout isn't ready yet. Wait until signing conditions are met, or check the cutoff date.",
	RuleAlreadyExecuted: "This payout has already been sent.",
	RuleAlreadyCancelled: "This payout was removed.",
	InsufficientTransferReceived:
		"USDC didn't transfer. Check the sender's balance and wallet approval.",
	UnauthorizedRuleRegistration:
		"Only the person paying can change this payout.",
	InvalidPayer: "The payer wallet for this payout isn't valid.",
	InvalidAmount: "The payout amount isn't valid.",
	InvalidReleaseConfig: "The pay-out-when settings aren't valid.",
	FileNotRegistered: "This document isn't registered yet.",
	ExceedsMaxLegs: "Too many recipients on this payout.",
	ExceedsMaxCommitments: "Too many signers linked to this payout.",
	InvalidLegIndex: "That recipient slot isn't valid for this payout.",
	LegAlreadyPaid: "This recipient was already paid.",
	PayerCannotBeRecipient:
		"The payer can't also be a recipient on the same payout.",
};

export function formatSettlementSimError(err: unknown): string {
	if (err instanceof BaseError) {
		const revertError = err.walk(
			(walkErr) => walkErr instanceof ContractFunctionRevertedError,
		);
		if (revertError instanceof ContractFunctionRevertedError) {
			const name = revertError.data?.errorName;
			if (name && SETTLEMENT_REVERT_MESSAGES[name]) {
				return SETTLEMENT_REVERT_MESSAGES[name];
			}
		}
	}

	const message =
		err instanceof Error
			? err.message
			: typeof err === "string"
				? err
				: "This payout couldn't go through. Try again or check your wallet.";

	for (const [name, friendly] of Object.entries(SETTLEMENT_REVERT_MESSAGES)) {
		if (message.includes(name)) return friendly;
	}

	const lower = message.toLowerCase();

	if (
		lower.includes("insufficient") ||
		lower.includes("allowance") ||
		lower.includes("transfer") ||
		lower.includes("balance")
	) {
		return "Insufficient USDC balance or allowance for this payout.";
	}
	if (lower.includes("not executable") || lower.includes("conditions")) {
		return "Payout release conditions are not met yet.";
	}
	if (lower.includes("unauthorized")) {
		return "You're not allowed to do that with this payout.";
	}

	return (
		message ||
		"This payout couldn't go through. Try again or check your wallet."
	);
}

function publicClientFor(contracts: FilosignContracts) {
	const chain = contracts.$client.chain;
	if (!chain) {
		throw new Error(
			"Chain config missing from Filosign contracts client; cannot simulate settlement write",
		);
	}
	return createPublicClient({ chain, transport: http() });
}

export function paymentValidatorAt(
	contracts: FilosignContracts,
	validatorAddress?: Address | string | null,
) {
	const base = contracts.FSPaymentValidator;
	if (!validatorAddress) return base;
	const address = getAddress(validatorAddress);
	if (address.toLowerCase() === base.address.toLowerCase()) return base;
	return getContract({
		address,
		abi: base.abi,
		client: {
			public: publicClientFor(contracts),
			wallet: contracts.$client,
		},
	});
}

export async function simulateSettlementWrite(args: {
	contracts: FilosignContracts;
	wallet: FilosignWallet;
	address: Address;
	abi: Abi;
	functionName: string;
	args: readonly unknown[];
	stateMutability?: AbiStateMutability;
}): Promise<void> {
	const publicClient = publicClientFor(args.contracts);
	try {
		await publicClient.simulateContract({
			address: args.address,
			abi: args.abi,
			functionName: args.functionName,
			args: args.args,
			account: args.wallet.account,
			...(args.stateMutability
				? { stateMutability: args.stateMutability }
				: {}),
		});
	} catch (err) {
		throw new Error(formatSettlementSimError(err), { cause: err });
	}
}
