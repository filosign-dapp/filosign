import type { Address } from "viem";
import { definitions as local } from "./local.js";
import { definitions as mainnet } from "./mainnet.js";
import { definitions as testnet } from "./testnet.js";

export type ChainDefinitionsEntry = {
	readonly FSEnvelopeRegistry: {
		readonly address: Address;
		readonly abi: typeof local.latest.FSEnvelopeRegistry.abi;
	};
	readonly FSPaymentValidator: {
		readonly address: Address;
		readonly abi: typeof local.latest.FSPaymentValidator.abi;
	};
	readonly FSAttachmentRelease?: {
		readonly address: Address;
		readonly abi: typeof local.latest.FSAttachmentRelease.abi;
	};
	readonly MockUSDC?: {
		readonly address: Address;
		readonly abi: typeof local.latest.MockUSDC.abi;
	};
};

export type HistoricalContractEntry = {
	readonly name: string;
	readonly abi: readonly unknown[];
};

export type ChainDefinitions = {
	readonly latest: ChainDefinitionsEntry;
	readonly byAddress: {
		readonly [address: string]: HistoricalContractEntry;
	};
};

export type ChainKey = "local" | "testnet" | "mainnet";

export { LOCAL_MOCK_USDC_ADDRESS } from "./mock-usdc.js";

export const CHAIN_KEYS: readonly ChainKey[] = [
	"local",
	"testnet",
	"mainnet",
] as const;

const BY_CHAIN: Record<ChainKey, ChainDefinitions> = {
	local,
	testnet,
	mainnet,
};

export function getDefinitionsEntry(chainKey: ChainKey): ChainDefinitionsEntry {
	const defs = BY_CHAIN[chainKey];
	if (!defs?.latest) {
		throw new Error(`No definitions for chain: ${chainKey}`);
	}
	return defs.latest;
}

export function getHistoricalAbi(
	contractName: string,
	address: string,
	chainKey: ChainKey,
): readonly unknown[] | null {
	const defs = BY_CHAIN[chainKey];
	if (!defs?.byAddress) return null;
	const entry = defs.byAddress[address.toLowerCase()];
	if (entry && entry.name === contractName) {
		return entry.abi;
	}
	return null;
}
