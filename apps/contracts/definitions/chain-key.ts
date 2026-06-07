export type ChainKey = "local" | "testnet" | "mainnet";

export const CHAIN_KEYS: readonly ChainKey[] = [
	"local",
	"testnet",
	"mainnet",
] as const;

export const CHAIN_ID_BY_KEY: Record<ChainKey, number> = {
	local: 31337,
	testnet: 84532,
	mainnet: 8453,
};
