import type { FilosignContracts } from "@filosign/contracts";
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
			"Chain config missing from Filosign contracts client; cannot resolve file registry",
		);
	}
	return createPublicClient({ chain, transport: http() });
}

/** Resolve FSFileRegistry for an existing file row (`registryAddress` from API). */
export function fileRegistryAt(
	contracts: FilosignContracts,
	registryAddress?: Address | string | null,
) {
	const base = contracts.FSFileRegistry;
	if (!registryAddress) return base;
	const address = getAddress(registryAddress);
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
