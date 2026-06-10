import type { FilosignContracts } from "@filosign/evm";
import { createPublicClient, http } from "viem";

/** Latest block timestamp for EIP-712 payloads (aligns with on-chain signature window). */
export async function latestChainTimestamp(
	contracts: FilosignContracts,
): Promise<number> {
	const chain = contracts.$client.chain;
	if (!chain) {
		throw new Error(
			"Chain config missing from Filosign contracts client; cannot derive on-chain timestamp",
		);
	}
	const publicClient = createPublicClient({
		chain,
		transport: http(),
	});
	const block = await publicClient.getBlock({ blockTag: "latest" });
	return Number(block.timestamp);
}
