import { formatUnits } from "viem";

export function truncateEvmAddress(value: string): string {
	if (!value.startsWith("0x") || value.length <= 12) {
		return value;
	}
	return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function formatWeiUnits(wei: string, decimals = 18): string {
	try {
		return formatUnits(BigInt(wei), decimals);
	} catch {
		return wei;
	}
}

export function formatWeiWithSymbol(
	wei: string | undefined,
	symbol: string,
	decimals = 18,
): string | undefined {
	if (!wei) return undefined;
	return `${formatWeiUnits(wei, decimals)} ${symbol}`;
}
