/// <reference path="../../types/dilithium-crystals-js.d.ts" />
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dilithiumFactory from "dilithium-crystals-js/dilithium.js";
import {
	DILITHIUM_PARAMS,
	generateKeys as genKeys,
	sign as signWithModule,
	verify as verifyWithModule,
} from "dilithium-crystals-js/src/common.js";
import type { DilithiumInstance } from "../../dilithium-instance";

function resolveWasmBinary(): Buffer {
	const candidates = [
		process.env.DILITHIUM_WASM_PATH,
		join(process.env.RESOURCES_PATH || process.cwd(), "assets/dilithium.wasm"),
		join(process.cwd(), "dilithium.wasm"),
		join(
			dirname(fileURLToPath(import.meta.url)),
			"../../../assets/dilithium.wasm",
		),
	];
	const found = candidates.find(
		(p): p is string => typeof p === "string" && existsSync(p),
	);
	if (!found) {
		throw new Error(
			`[dilithium] WASM not found; tried: ${candidates.filter(Boolean).join(", ")}`,
		);
	}
	return readFileSync(found);
}

let ready: Promise<DilithiumInstance> | undefined;

/**
 * Node/Bun Dilithium - never import `dilithium-crystals-js` main (CJS `exports = promise.then`
 * breaks `bun build --compile` with "|this| is not a Promise"). Bundle emscripten + common only.
 */
export function loadNodeDilithium(): Promise<DilithiumInstance> {
	ready ??= (async (): Promise<DilithiumInstance> => {
		const wasmBinary = resolveWasmBinary();
		const dilithium = await Promise.resolve(
			dilithiumFactory({
				wasmBinary,
				locateFile: (f: string) => (f.endsWith(".wasm") ? "dilithium.wasm" : f),
			}),
		);

		return {
			generateKeys: (kind, seed) => genKeys(dilithium, kind, seed),
			sign: (msg, sk, kind) => signWithModule(dilithium, msg, sk, kind),
			verify: (sig, msg, pk, kind) =>
				verifyWithModule(dilithium, sig, msg, pk, kind),
			DILITHIUM_PARAMS,
		} satisfies DilithiumInstance;
	})();
	return ready;
}
