import type { FilosignContracts } from "@filosign/contracts";
import {
	deriveDeterministicSeed32,
	expandDeterministicSeed,
	seedKeyGen,
} from "@filosign/crypto-utils";
import type { UseWalletClientReturnType } from "wagmi";
import type { FilosignContextValue } from "../../context/FilosignContext";
import type { StoredKeygenData } from "./key-registry-snapshot";

type Wallet = NonNullable<UseWalletClientReturnType["data"]>;

export async function unlockSeedFromWallet(args: {
	wallet: Wallet;
	contracts: FilosignContracts;
	wasm: FilosignContextValue["wasm"];
	/** When provided, skips a duplicate FSKeyRegistry.keygenData eth_call. */
	storedKeygenData?: StoredKeygenData;
}): Promise<Uint8Array | null> {
	const { wallet, contracts, wasm } = args;

	try {
		const stored =
			args.storedKeygenData ??
			(await (async () => {
				const [, saltSeed, saltChallenge, commitmentKem, commitmentSig] =
					await contracts.FSKeyRegistry.read.keygenData([
						wallet.account.address,
					]);
				if (!saltSeed || !saltChallenge || !commitmentKem || !commitmentSig) {
					return undefined;
				}
				return {
					saltSeed,
					saltChallenge,
					commitmentKem,
					commitmentSig,
				} satisfies StoredKeygenData;
			})());

		if (!stored) {
			return null;
		}

		const { saltSeed, saltChallenge, commitmentKem, commitmentSig } = stored;

		const seedCore32 = await deriveDeterministicSeed32(wallet, {
			saltChallenge,
			saltSeed,
		});
		const seed = await expandDeterministicSeed(seedCore32);
		const keygenData = await seedKeyGen(new Uint8Array(Array.from(seed)), {
			dl: wasm.dilithium,
		});

		if (
			commitmentKem !== keygenData.commitmentKem ||
			commitmentSig !== keygenData.commitmentSig
		) {
			return null;
		}

		return seed;
	} catch {
		return null;
	}
}
