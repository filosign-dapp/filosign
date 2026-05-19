import dilithiumWasmUrl from "../../assets/dilithium.wasm?url";
import type { DilithiumInstance } from "../dilithium-instance";

export type { DilithiumInstance };

export async function loadBrowserDilithium(): Promise<DilithiumInstance> {
	const mod = (await import("dilithium-crystals-js")) as unknown as {
		createDilithium: (wasmUrl: string) => Promise<DilithiumInstance>;
	};
	return mod.createDilithium(dilithiumWasmUrl);
}
