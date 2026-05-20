import type { Hex } from "viem";
import { evmClient } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

export async function receiptMeta(txHash: Hex): Promise<{
	blockNumber: number | null;
	timestamp: number | null;
}> {
	const recRes = await tryCatch(
		evmClient.getTransactionReceipt({ hash: txHash }),
	);
	const receipt = recRes.data;
	if (!receipt?.blockNumber) {
		return { blockNumber: null, timestamp: null };
	}
	const blockNumber = Number(receipt.blockNumber);
	let timestamp: number | null = null;
	const blockRes = await tryCatch(
		evmClient.getBlock({ blockNumber: receipt.blockNumber }),
	);
	if (blockRes.data?.timestamp) {
		timestamp = Number(blockRes.data.timestamp);
	}
	return { blockNumber, timestamp };
}
