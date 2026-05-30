import type { FilosignContracts } from "@filosign/contracts";
import { createPublicClient, http } from "viem";

/** Latest block timestamp for EIP-712 payloads (aligns with on-chain signature window). */
export async function latestChainTimestamp(
	contracts: FilosignContracts,
): Promise<number> {
	const chain = contracts.$client.chain;
	if (!chain) {
		return Math.floor(Date.now() / 1000);
	}
	const publicClient = createPublicClient({
		chain,
		transport: http(),
	});
	const block = await publicClient.getBlock({ blockTag: "latest" });
	return Number(block.timestamp);
}
