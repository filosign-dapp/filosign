import {
	deriveDeterministicSeed32,
	expandDeterministicSeed,
	seedKeyGen,
} from "@filosign/crypto-utils";
import { entropyToMnemonic, mnemonicToEntropy, validateMnemonic } from "bip39";
import type { FilosignContextValue } from "../../context/FilosignContext";
import type { FilosignWallet } from "../../lib/wallet";
import type { StoredKeygenData } from "./key-registry-snapshot";

export function recoveryPhraseFromSeed(seedCore32: Uint8Array) {
	const entropyHex = Array.from(seedCore32)
		.map((n) => n.toString(16).padStart(2, "0"))
		.join("");
	return entropyToMnemonic(entropyHex);
}

export async function seedFromRecoveryPhrase(phrase: string) {
	const normalized = phrase.trim().toLowerCase().replace(/\s+/g, " ");
	if (!validateMnemonic(normalized)) {
		throw new Error("Invalid recovery phrase");
	}
	const entropyHex = mnemonicToEntropy(normalized);
	const entropy = new Uint8Array(
		entropyHex.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? [],
	);
	return expandDeterministicSeed(entropy);
}

export async function deriveRecoveryPhraseFromWallet(args: {
	wallet: FilosignWallet;
	wasm: FilosignContextValue["wasm"];
	storedKeygenData: StoredKeygenData;
}): Promise<string> {
	const { saltSeed, saltChallenge, commitmentKem, commitmentSig } =
		args.storedKeygenData;
	const seedCore32 = await deriveDeterministicSeed32(args.wallet, {
		saltChallenge,
		saltSeed,
	});
	const seed = await expandDeterministicSeed(seedCore32);
	const dilithium = args.wasm.dilithium;
	if (!dilithium) {
		throw new Error("Crypto module not ready");
	}
	const keygenData = await seedKeyGen(new Uint8Array(Array.from(seed)), {
		dl: dilithium,
	});
	if (
		commitmentKem !== keygenData.commitmentKem ||
		commitmentSig !== keygenData.commitmentSig
	) {
		throw new Error("Unable to derive recovery phrase");
	}
	return recoveryPhraseFromSeed(seedCore32);
}
