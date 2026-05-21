declare module "dilithium-crystals-js/dilithium.js" {
	type EmscriptenFactory = (opts: {
		wasmBinary: Buffer | Uint8Array;
		locateFile?: (filename: string) => string;
	}) => PromiseLike<unknown>;

	const factory: EmscriptenFactory;
	export = factory;
}

declare module "dilithium-crystals-js/src/common.js" {
	export const DILITHIUM_PARAMS: unknown;
	export function generateKeys(
		dilithium: unknown,
		kind: unknown,
		seed: Uint8Array,
	): { publicKey: Uint8Array; privateKey: Uint8Array };
	export function sign(
		dilithium: unknown,
		message: Uint8Array,
		privateKey: Uint8Array,
		kind: unknown,
	): { signature: Uint8Array };
	export function verify(
		dilithium: unknown,
		signature: Uint8Array,
		message: Uint8Array,
		publicKey: Uint8Array,
		kind: unknown,
	): { result: number };
}
