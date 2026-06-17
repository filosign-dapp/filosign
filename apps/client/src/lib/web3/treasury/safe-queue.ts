import {
	safeAppUrlForChainId,
	safeTransactionServiceUrlForChainId,
} from "@filosign/shared";

type SafeMultisigTx = {
	nonce?: number;
	transactionHash?: string | null;
	safeTxHash?: string;
};

type SafeMultisigTxResponse = {
	results?: SafeMultisigTx[];
};

export async function readSafePendingQueue(
	safeAddress: `0x${string}`,
	chainId: number,
): Promise<{
	pendingCount: number;
	firstPendingNonce: number | null;
	explorerUrl: string | null;
}> {
	const baseUrl = safeTransactionServiceUrlForChainId(chainId);
	if (!baseUrl) {
		return { pendingCount: 0, firstPendingNonce: null, explorerUrl: null };
	}
	const apiUrl = `${baseUrl}/api/v1/safes/${safeAddress}/multisig-transactions/?executed=false&limit=10`;
	const res = await fetch(apiUrl);
	if (!res.ok) {
		return { pendingCount: 0, firstPendingNonce: null, explorerUrl: null };
	}
	const data = (await res.json()) as SafeMultisigTxResponse;
	const pending = (data.results ?? []).filter((tx) => !tx.transactionHash);
	const firstPendingNonce =
		pending.length > 0
			? Math.min(
					...pending
						.map((tx) => tx.nonce)
						.filter((nonce): nonce is number => typeof nonce === "number"),
				)
			: null;
	return {
		pendingCount: pending.length,
		firstPendingNonce,
		explorerUrl: safeAppUrlForChainId(chainId, safeAddress),
	};
}
