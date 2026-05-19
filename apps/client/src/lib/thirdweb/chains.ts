import { defineChain } from "thirdweb/chains";
import type { Chain } from "viem";
import { defaultChain } from "@/src/constants";

function thirdwebChainFromViem(chain: Chain) {
	const rpc = chain.rpcUrls.default.http[0];
	if (!rpc) {
		throw new Error(`Chain ${chain.id} has no default RPC URL`);
	}
	const explorer = chain.blockExplorers?.default;
	return defineChain({
		id: chain.id,
		name: chain.name,
		nativeCurrency: chain.nativeCurrency,
		rpc,
		blockExplorers: explorer
			? [{ name: explorer.name, url: explorer.url, apiUrl: explorer.apiUrl }]
			: undefined,
	});
}

export const defaultThirdwebChain = thirdwebChainFromViem(defaultChain);
