import { getAddress } from "viem";

const tailByWallet = new Map<string, Promise<void>>();

/**
 * Serializes registry EIP-712 signing per wallet so two tabs do not race the same
 * action before relay (defense in depth alongside on-chain replay guards).
 */
export async function withRegistryWalletActionLock<T>(
	wallet: `0x${string}`,
	run: () => Promise<T>,
): Promise<T> {
	const key = getAddress(wallet).toLowerCase();
	const prev = tailByWallet.get(key) ?? Promise.resolve();
	let release!: () => void;
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	const tail = prev.then(() => gate);
	tailByWallet.set(key, tail);
	await prev;
	try {
		return await run();
	} finally {
		release();
		if (tailByWallet.get(key) === tail) {
			tailByWallet.delete(key);
		}
	}
}
