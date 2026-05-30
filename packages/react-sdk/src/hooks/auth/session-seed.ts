const sessionSeedByWallet = new Map<string, Uint8Array<ArrayBufferLike>>();

export function setSessionSeed(
	wallet: string,
	seed: Uint8Array<ArrayBufferLike>,
) {
	const key = wallet.toLowerCase();
	sessionSeedByWallet.set(key, new Uint8Array(seed));
}

export function getSessionSeed(wallet: string) {
	const seed = sessionSeedByWallet.get(wallet.toLowerCase());
	return seed ? new Uint8Array(seed) : undefined;
}

export function clearSessionSeed(wallet: string) {
	sessionSeedByWallet.delete(wallet.toLowerCase());
}
