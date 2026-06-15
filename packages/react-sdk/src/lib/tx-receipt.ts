import type { FilosignContracts } from "@filosign/evm";
import type {
	Abi,
	Address,
	Hash,
	Log,
	PublicClient,
	TransactionReceipt,
} from "viem";
import {
	BaseError,
	ContractFunctionRevertedError,
	createPublicClient,
	decodeErrorResult,
	http,
	parseEventLogs,
} from "viem";
import { formatSettlementSimError } from "./settlement-preflight";

export type WaitForTxReceiptOptions = {
	label?: string;
	abi?: Abi;
	/** Injected public client (tests only). */
	client?: PublicClient;
};

export function filosignPublicClient(
	contracts: FilosignContracts,
): PublicClient {
	const chain = contracts.$client.chain;
	if (!chain) {
		throw new Error(
			"Chain config missing from Filosign contracts client; cannot wait for transaction receipts",
		);
	}
	return createPublicClient({
		chain,
		transport: http(),
	});
}

export async function waitForTxReceipt(
	contracts: FilosignContracts,
	hash: Hash,
	options?: WaitForTxReceiptOptions,
): Promise<TransactionReceipt> {
	const client = options?.client ?? filosignPublicClient(contracts);
	const receipt = await client.waitForTransactionReceipt({ hash });
	if (receipt.status !== "success") {
		const friendly = await resolveReceiptFailureMessage({
			client,
			hash,
			receipt,
			abi: options?.abi,
		});
		const label = options?.label
			? `${options.label} failed`
			: "Transaction failed";
		throw new Error(`${label}: ${friendly}`);
	}
	return receipt;
}

function friendlyRevertName(name: string): string {
	return formatSettlementSimError(new Error(name));
}

function revertNameFromError(err: unknown): string | null {
	if (!(err instanceof BaseError)) {
		return null;
	}
	const reverted = err.walk(
		(walkErr) => walkErr instanceof ContractFunctionRevertedError,
	);
	if (!(reverted instanceof ContractFunctionRevertedError)) {
		return null;
	}
	return reverted.data?.errorName ?? null;
}

function revertDataFromMessage(err: unknown): `0x${string}` | null {
	const message = err instanceof Error ? err.message : String(err);
	const match = message.match(/0x[0-9a-fA-F]{8,}/);
	if (!match) {
		return null;
	}
	return match[0] as `0x${string}`;
}

function decodeRevertMessage(err: unknown, abi?: Abi): string | null {
	const revertedName = revertNameFromError(err);
	if (revertedName) {
		return friendlyRevertName(revertedName);
	}

	if (!abi) {
		return null;
	}

	const data = revertDataFromMessage(err);
	if (!data) {
		return null;
	}

	try {
		const decoded = decodeErrorResult({ abi, data });
		if (decoded.errorName) {
			return friendlyRevertName(decoded.errorName);
		}
	} catch {
		return null;
	}

	return null;
}

async function resolveReceiptFailureMessage(args: {
	client: PublicClient;
	hash: Hash;
	receipt: Pick<TransactionReceipt, "blockNumber">;
	abi?: Abi;
}): Promise<string> {
	try {
		const tx = await args.client.getTransaction({ hash: args.hash });
		if (!tx.to) {
			return `Transaction ${args.hash} reverted on-chain`;
		}
		await args.client.call({
			to: tx.to,
			data: tx.input,
			blockNumber: args.receipt.blockNumber,
		});
	} catch (err) {
		const decoded = decodeRevertMessage(err, args.abi);
		if (decoded) {
			return decoded;
		}
		return formatSettlementSimError(err);
	}
	return `Transaction ${args.hash} reverted on-chain`;
}

export function parseRuleIdFromReceipt(args: {
	receipt: Pick<TransactionReceipt, "logs">;
	emitter: Address;
	abi: Abi;
	eventName: "PaymentRuleRegistered" | "AttachmentRuleRegistered";
}): string {
	const parsed = parseEventLogs({
		abi: args.abi,
		logs: [...args.receipt.logs] as Log[],
		eventName: args.eventName,
	});
	const emitter = args.emitter.toLowerCase();
	const match = parsed.find(
		(log) =>
			log.eventName === args.eventName && log.address.toLowerCase() === emitter,
	);
	if (!match) {
		throw new Error(
			`${args.eventName} event not found in receipt from ${args.emitter}`,
		);
	}
	const ruleId = (match.args as { ruleId: bigint }).ruleId;
	return ruleId.toString(10);
}
