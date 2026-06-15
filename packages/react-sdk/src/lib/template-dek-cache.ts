import type { Address } from "viem";

type TemplateDekCacheEntry = {
	dek: Uint8Array;
	wallet: Address;
};

const templateDekById = new Map<string, TemplateDekCacheEntry>();

export function getCachedTemplateDek(
	templateId: string,
	wallet: Address,
): Uint8Array | undefined {
	const entry = templateDekById.get(templateId);
	if (!entry) return undefined;
	if (entry.wallet.toLowerCase() !== wallet.toLowerCase()) {
		templateDekById.delete(templateId);
		return undefined;
	}
	return entry.dek;
}

export function setCachedTemplateDek(
	templateId: string,
	wallet: Address,
	dek: Uint8Array,
): void {
	templateDekById.set(templateId, { dek, wallet });
}

export function clearCachedTemplateDek(templateId: string): void {
	templateDekById.delete(templateId);
}

export function clearAllTemplateDekCache(): void {
	templateDekById.clear();
}
