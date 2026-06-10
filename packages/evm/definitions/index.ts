import type { Abi } from "viem";
import type {
	ChainDefinitionsBundle,
	LatestContracts,
} from "./bundle-types.js";
import type { ChainKey } from "./chain-key.js";
import { definitions as local } from "./generated/local.js";
import { definitions as mainnet } from "./generated/mainnet.js";
import { definitions as testnet } from "./generated/testnet.js";
import type { AbiJson, ContractName } from "./schema.js";

export type ChainDefinitionsEntry = LatestContracts;

export type HistoricalContractEntry = {
	readonly name: ContractName;
	readonly abi: AbiJson;
};

export type { ChainDefinitionsBundle } from "./bundle-types.js";
export { CHAIN_KEYS, type ChainKey } from "./chain-key.js";

export { LOCAL_MOCK_USDC_ADDRESS } from "./mock-usdc.js";

function chainModule(chainKey: ChainKey): ChainDefinitionsBundle {
	switch (chainKey) {
		case "local":
			return local;
		case "testnet":
			return testnet;
		case "mainnet":
			return mainnet;
	}
}

function latestEntry(chainKey: ChainKey): LatestContracts | null {
	return chainModule(chainKey).latest;
}

export function getDefinitionsEntry(chainKey: ChainKey): ChainDefinitionsEntry {
	const entry = latestEntry(chainKey);
	if (!entry?.FSEnvelopeRegistry) {
		throw new Error(`No definitions for chain: ${chainKey}`);
	}
	return entry;
}

export function toViemAbi(abi: AbiJson): Abi {
	return abi as unknown as Abi;
}

export function getHistoricalAbi(
	contractName: string,
	address: string,
	chainKey: ChainKey,
): Abi | null {
	const defs = chainModule(chainKey);
	const normalized = address.toLowerCase();

	const historical = defs.historicalByAddress[normalized];
	if (historical && historical.name === contractName) {
		return toViemAbi(historical.abi);
	}

	const latest = latestEntry(chainKey);
	if (!latest) return null;

	const contract = latest[contractName as keyof LatestContracts];
	if (contract && typeof contract === "object" && "abi" in contract) {
		return toViemAbi(contract.abi);
	}
	return null;
}
