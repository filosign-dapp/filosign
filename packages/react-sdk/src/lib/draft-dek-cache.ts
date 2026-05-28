import type { Address } from "viem";

type DraftDekCacheEntry = {
	dek: Uint8Array;
	wallet: Address;
};

const draftDekById = new Map<string, DraftDekCacheEntry>();

export function getCachedDraftDek(
	draftId: string,
	wallet: Address,
): Uint8Array | undefined {
	const entry = draftDekById.get(draftId);
	if (!entry) return undefined;
	if (entry.wallet.toLowerCase() !== wallet.toLowerCase()) {
		draftDekById.delete(draftId);
		return undefined;
	}
	return entry.dek;
}

export function setCachedDraftDek(
	draftId: string,
	wallet: Address,
	dek: Uint8Array,
): void {
	draftDekById.set(draftId, { dek, wallet });
}

export function clearCachedDraftDek(draftId: string): void {
	draftDekById.delete(draftId);
}

export function clearAllDraftDekCache(): void {
	draftDekById.clear();
}
