import { decodeEventLog, type Hash } from "viem";
import env from "@/env";
import { processFsManagerLogFromIndexer } from "@/lib/domains/sharing/fs-manager-indexer";
import { handleKeygenDataRegisteredFromIndexer } from "@/lib/domains/users/keygen-indexer";
import { evmClient, fsContracts } from "@/lib/platform/evm";
import tryCatchSync, { tryCatch } from "@/lib/platform/utils/tryCatch";
import type { IndexerTxBodyParsed } from "@/lib/platform/validation/tx-registration";
import { ProcessTxUserError } from "./errors";

const { FSKeyRegistry, FSManager } = fsContracts;

function contractMatchesReceipt(
	receipt: {
		contractAddress?: `0x${string}` | null;
		to?: `0x${string}` | null;
	},
	contractAddress: string,
): boolean {
	return [
		receipt.contractAddress?.toLowerCase(),
		receipt.to?.toLowerCase(),
	].includes(contractAddress.toLowerCase());
}

export async function processTransaction(
	txHash: Hash,
	data: IndexerTxBodyParsed,
) {
	const receipt = await evmClient.waitForTransactionReceipt({ hash: txHash });

	if (!receipt) {
		console.error("[indexer] waitForTransactionReceipt returned empty", {
			txHash,
		});
		throw new ProcessTxUserError(
			"Transaction receipt not available. Retry shortly.",
			502,
		);
	}

	if (receipt.status === "reverted") {
		throw new ProcessTxUserError(
			"Transaction reverted on-chain; nothing to index",
			400,
		);
	}

	if (contractMatchesReceipt(receipt, FSKeyRegistry.address)) {
		for (const encodedLog of receipt.logs) {
			const decoded = tryCatchSync(() =>
				decodeEventLog({
					abi: FSKeyRegistry.abi,
					topics: encodedLog.topics,
					data: encodedLog.data,
				}),
			);
			if (decoded.error) {
				if (env.DEBUG) {
					console.error("FSKeyRegistry log decode skipped:", decoded.error);
				}
				continue;
			}
			const log = decoded.data;
			if (log.eventName === "KeygenDataRegistered") {
				const insertRes = await tryCatch(
					handleKeygenDataRegisteredFromIndexer(data, log),
				);
				if (insertRes.error) {
					console.error("[indexer] Keygen insert error:", insertRes.error);
					if (insertRes.error instanceof ProcessTxUserError)
						throw insertRes.error;
					throw new ProcessTxUserError(
						"Failed to persist registration profile",
						500,
					);
				}
			}
		}
	}

	if (contractMatchesReceipt(receipt, FSManager.address)) {
		for (const encodedLog of receipt.logs) {
			await processFsManagerLogFromIndexer(txHash, encodedLog);
		}
	}
}
