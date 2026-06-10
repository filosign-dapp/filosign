import path from "node:path";
import { fileURLToPath } from "node:url";

/** `packages/evm` (this workspace package root). */
export function evmPackageDir(): string {
	return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
}

/** `oss/packages/contracts` (Hardhat project root). */
export function contractsPackageDir(): string {
	return path.join(evmPackageDir(), "../../oss/packages/contracts");
}
