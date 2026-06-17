import {
	safeAppUrlForChainId,
	safeTransactionServiceUrlForChainId,
} from "@filosign/shared";
import type { Address, Hex } from "viem";
import { treasuryChainId } from "@/src/lib/web3/treasury/chain";

type Eip1193Provider = {
	request: (args: {
		method: string;
		params?: unknown[] | object;
	}) => Promise<unknown>;
};

export async function loadSafeApiKit() {
	const { default: SafeApiKit } = await import("@safe-global/api-kit");
	return SafeApiKit;
}

export async function loadSafeProtocolKit() {
	const { default: Safe } = await import("@safe-global/protocol-kit");
	return Safe;
}

export function safeApiKitConfig(chainId = treasuryChainId()) {
	const txServiceUrl = safeTransactionServiceUrlForChainId(chainId);
	if (!txServiceUrl) {
		throw new Error(
			"Safe Transaction Service is not available on this network.",
		);
	}
	return {
		chainId: BigInt(chainId),
		txServiceUrl,
	};
}

export async function createSafeApiKit(chainId = treasuryChainId()) {
	const SafeApiKit = await loadSafeApiKit();
	return new SafeApiKit(safeApiKitConfig(chainId));
}

export async function createSafeProtocolKit(args: {
	safeAddress: Address;
	provider: Eip1193Provider;
}) {
	const Safe = await loadSafeProtocolKit();
	return Safe.init({
		provider: args.provider,
		safeAddress: args.safeAddress,
	});
}

export async function readSafeMessageHashFromContract(args: {
	publicClient: import("viem").PublicClient;
	safeAddress: Address;
	typedDataHash: Hex;
}): Promise<Hex> {
	const hash = await args.publicClient.readContract({
		address: args.safeAddress,
		abi: [
			{
				type: "function",
				name: "getMessageHash",
				stateMutability: "view",
				inputs: [{ name: "message", type: "bytes" }],
				outputs: [{ name: "", type: "bytes32" }],
			},
		],
		functionName: "getMessageHash",
		args: [args.typedDataHash],
	});
	return hash as Hex;
}

const DEFAULT_POLL_INTERVAL_MS = 3_000;
const DEFAULT_POLL_TIMEOUT_MS = 10 * 60 * 1_000;

export async function pollSafeMessageConfirmations(args: {
	messageHash: Hex;
	threshold: bigint;
	chainId?: number;
	intervalMs?: number;
	timeoutMs?: number;
}): Promise<void> {
	const apiKit = await createSafeApiKit(args.chainId);
	const deadline = Date.now() + (args.timeoutMs ?? DEFAULT_POLL_TIMEOUT_MS);
	const intervalMs = args.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;

	while (Date.now() < deadline) {
		const message = await apiKit.getMessage(args.messageHash);
		const messageData = message as {
			confirmations?: unknown[];
			confirmationsSubmitted?: number;
		};
		const confirmationsCount =
			typeof messageData.confirmationsSubmitted === "number"
				? messageData.confirmationsSubmitted
				: Array.isArray(messageData.confirmations)
					? messageData.confirmations.length
					: 0;
		if (BigInt(confirmationsCount) >= args.threshold) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}

	throw new Error(
		"Timed out waiting for treasury Safe message signatures. Finish signing in Safe, then try linking again.",
	);
}

export async function pollSafeTransactionExecution(args: {
	safeTxHash: string;
	chainId?: number;
	intervalMs?: number;
	timeoutMs?: number;
}): Promise<{ transactionHash: Hex }> {
	const apiKit = await createSafeApiKit(args.chainId);
	const deadline = Date.now() + (args.timeoutMs ?? DEFAULT_POLL_TIMEOUT_MS);
	const intervalMs = args.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;

	while (Date.now() < deadline) {
		const tx = await apiKit.getTransaction(args.safeTxHash);
		if (tx.transactionHash) {
			return { transactionHash: tx.transactionHash as Hex };
		}
		if (tx.isExecuted && tx.transactionHash) {
			return { transactionHash: tx.transactionHash as Hex };
		}
		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}

	const serviceUrl = safeTransactionServiceUrlForChainId(
		args.chainId ?? treasuryChainId(),
	);
	throw new Error(
		serviceUrl
			? `Timed out waiting for treasury Safe transaction execution. Check pending transactions: ${serviceUrl}`
			: "Timed out waiting for treasury Safe transaction execution.",
	);
}

export function safeExplorerQueueUrl(
	safeAddress: Address,
	chainId = treasuryChainId(),
): string | null {
	return safeAppUrlForChainId(chainId, safeAddress);
}
