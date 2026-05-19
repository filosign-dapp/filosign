import { definitions as local } from "./local.js";
import { definitions as mainnet } from "./mainnet.js";
import { definitions as testnet } from "./testnet.js";

export type ChainDefinitionsEntry = (typeof local)[keyof typeof local];
export type ChainKey = "local" | "testnet" | "mainnet";

export { LOCAL_MOCK_USDC_ADDRESS } from "./mock-usdc.js";

export const CHAIN_KEYS: readonly ChainKey[] = [
	"local",
	"testnet",
	"mainnet",
] as const;

const BY_CHAIN: Record<ChainKey, Record<string, ChainDefinitionsEntry>> = {
	local: local as unknown as Record<string, ChainDefinitionsEntry>,
	testnet: testnet as unknown as Record<string, ChainDefinitionsEntry>,
	mainnet: mainnet as unknown as Record<string, ChainDefinitionsEntry>,
};

export function getDefinitionsEntry(chainKey: ChainKey): ChainDefinitionsEntry {
	const defs = BY_CHAIN[chainKey];
	const entry = Object.values(defs)[0];
	if (!entry) throw new Error(`No definitions for chain: ${chainKey}`);
	return entry;
}
