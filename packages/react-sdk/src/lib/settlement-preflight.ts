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
		"Payout is not ready yet. Wait for signing conditions or check that the rule has not expired.",
	RuleAlreadyExecuted: "This payout has already been executed.",
	RuleAlreadyCancelled: "This payout rule was cancelled.",
	InsufficientTransferReceived:
		"USDC transfer failed. Check sender balance and validator allowance.",
	UnauthorizedRuleRegistration:
		"Only the payer can modify this settlement rule.",
	InvalidPayer: "Invalid payer address for this settlement rule.",
	InvalidAmount: "Invalid payout amount for this settlement rule.",
	InvalidReleaseConfig:
		"Invalid release configuration for this settlement rule.",
	FileNotRegistered: "The linked file is not registered on-chain.",
	ExceedsMaxLegs: "Too many payout legs for this settlement rule.",
	ExceedsMaxCommitments:
		"Too many signer commitments for this settlement rule.",
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
				: "Settlement transaction would fail on-chain.";

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
		return "You are not authorized to perform this settlement action.";
	}

	return message || "Settlement transaction would fail on-chain.";
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
