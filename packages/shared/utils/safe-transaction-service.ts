export const SAFE_TX_SERVICE_BY_CHAIN_ID = {
	1: "https://safe-transaction-mainnet.safe.global",
	8453: "https://safe-transaction-base.safe.global",
	11155111: "https://safe-transaction-sepolia.safe.global",
	84532: "https://safe-transaction-base-sepolia.safe.global",
} as const;

export function safeTransactionServiceUrlForChainId(
	chainId: number,
): string | null {
	return (
		SAFE_TX_SERVICE_BY_CHAIN_ID[
			chainId as keyof typeof SAFE_TX_SERVICE_BY_CHAIN_ID
		] ?? null
	);
}

export const SAFE_APP_SHORTNAME_BY_CHAIN_ID = {
	1: "eth",
	8453: "base",
	11155111: "sep",
	84532: "basesep",
} as const;

export function safeAppUrlForChainId(
	chainId: number,
	safeAddress: string,
): string | null {
	const shortname =
		SAFE_APP_SHORTNAME_BY_CHAIN_ID[
			chainId as keyof typeof SAFE_APP_SHORTNAME_BY_CHAIN_ID
		];
	if (!shortname) return null;
	return `https://app.safe.global/home?safe=${shortname}:${safeAddress}`;
}
