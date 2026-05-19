/** Dilithium API surface (browser in-app instance or Node module). */
export type DilithiumInstance = {
	generateKeys: (
		kind: unknown,
		seed: Uint8Array,
	) => { publicKey: Uint8Array; privateKey: Uint8Array };
	sign: (
		message: Uint8Array,
		privateKey: Uint8Array,
		kind: unknown,
	) => { signature: Uint8Array };
	verify: (
		signature: Uint8Array,
		message: Uint8Array,
		publicKey: Uint8Array,
		kind: unknown,
	) => { result: number };
	DILITHIUM_PARAMS?: unknown;
};
