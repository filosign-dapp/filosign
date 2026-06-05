import {
	type Address,
	createPublicClient,
	custom,
	getAddress,
	getContract,
} from "viem";
import type { FilosignContracts } from "./contracts";

/** Fallback when on-chain `eip712Domain()` is unavailable (tests). */
export const REGISTRY_EIP712_VERSION = "1" as const;

type RegistryEip712Domain = {
	name: string;
	version: string;
	chainId: number;
	verifyingContract: Address;
};

const domainByRegistry = new Map<string, RegistryEip712Domain>();

function publicClientFor(contracts: FilosignContracts) {
	const chain = contracts.$client.chain;
	if (!chain) {
		throw new Error(
			"Wallet client chain missing; cannot read FSEnvelopeRegistry EIP-712 domain",
		);
	}
	return createPublicClient({
		chain,
		transport: custom(contracts.$client),
	});
}

function registryContractAt(contracts: FilosignContracts, address: Address) {
	const target = getAddress(address);
	const base = contracts.FSEnvelopeRegistry;
	if (target.toLowerCase() === base.address.toLowerCase()) {
		return base;
	}
	return getContract({
		address: target,
		abi: base.abi,
		client: {
			public: publicClientFor(contracts),
			wallet: contracts.$client,
		},
	});
}

export async function readRegistryEip712Domain(
	contracts: FilosignContracts,
	verifyingContract?: Address,
): Promise<RegistryEip712Domain> {
	const address = getAddress(
		verifyingContract ?? contracts.FSEnvelopeRegistry.address,
	);
	const cacheKey = address.toLowerCase();
	const cached = domainByRegistry.get(cacheKey);
	if (cached) return cached;

	const result = await registryContractAt(
		contracts,
		address,
	).read.eip712Domain();

	const [, name, version, chainId, contractAddress] = result as readonly [
		string,
		string,
		string,
		bigint,
		Address,
		`0x${string}`,
		readonly bigint[],
	];

	const domain: RegistryEip712Domain = {
		name,
		version,
		chainId: Number(chainId),
		verifyingContract: getAddress(contractAddress),
	};
	domainByRegistry.set(cacheKey, domain);
	return domain;
}

export function clearRegistryEip712DomainCache(): void {
	domainByRegistry.clear();
}
