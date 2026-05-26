import type { Hash } from "viem";
import type { IndexerTxBodyParsed } from "@/lib/platform/validation/tx-registration";
import { ProcessTxUserError } from "./errors";

/** Waits for receipt; file-registry flows do not require post-tx DB indexing here. */
export async function processTransaction(
	txHash: Hash,
	_data: IndexerTxBodyParsed,
) {
	const { evmClient } = await import("@/lib/platform/evm");
	const receipt = await evmClient.waitForTransactionReceipt({ hash: txHash });

	if (!receipt) {
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
}
