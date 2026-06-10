import type { FilosignContracts } from "@filosign/evm";
import { getHistoricalAbi } from "@filosign/evm";
import {
	type Address,
	createPublicClient,
	getAddress,
	getContract,
	http,
} from "viem";

function publicClientFor(contracts: FilosignContracts) {
	const chain = contracts.$client.chain;
	if (!chain) {
		throw new Error(
			"Chain config missing from Filosign contracts client; cannot resolve envelope registry",
		);
	}
	return createPublicClient({ chain, transport: http() });
}

/** Resolve FSEnvelopeRegistry for an existing file row (`registryAddress` from API). */
export function envelopeRegistryAt(
	contracts: FilosignContracts,
	registryAddress?: Address | string | null,
) {
	const base = contracts.FSEnvelopeRegistry;
	if (!registryAddress) return base;
	const address = getAddress(registryAddress);
	if (address.toLowerCase() === base.address.toLowerCase()) return base;
	const historicalAbi = getHistoricalAbi(
		"FSEnvelopeRegistry",
		address,
		contracts.$chainKey,
	);
	return getContract({
		address,
		abi: (historicalAbi as typeof base.abi) ?? base.abi,
		client: {
			public: publicClientFor(contracts),
			wallet: contracts.$client,
		},
	});
}
