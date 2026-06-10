import path from "node:path";
import type { ChainKey } from "../../../definitions/chain-key.js";
import { contractsPackageDir, evmPackageDir } from "../repo-paths.js";

export const DEFINITIONS_ROOT = path.join(evmPackageDir(), "definitions");

/** Relative prefix for generated TS import strings only. */
export const DEFINITIONS_REL_ROOT = "definitions";

/** Hardhat project root (`@filosign/contracts`). */
export const CONTRACTS_ROOT = contractsPackageDir();

export const PUBLIC_ABIS_ROOT = `${CONTRACTS_ROOT}/abis`;
export const PUBLIC_CHAINS_MANIFEST = `${CONTRACTS_ROOT}/chains/manifest.json`;

export function chainDir(chainKey: ChainKey) {
	return `${DEFINITIONS_ROOT}/chains/${chainKey}`;
}

export function latestPointerPath(chainKey: ChainKey) {
	return `${chainDir(chainKey)}/latest.json`;
}

export function addressIndexPath(chainKey: ChainKey) {
	return `${chainDir(chainKey)}/address-index.json`;
}

export function deploymentDir(chainKey: ChainKey, deploymentId: string) {
	return `${chainDir(chainKey)}/deployments/${deploymentId}`;
}

export function manifestPath(chainKey: ChainKey, deploymentId: string) {
	return `${deploymentDir(chainKey, deploymentId)}/manifest.json`;
}

export function abiStorePath(abiRef: string) {
	return `${DEFINITIONS_ROOT}/abis/${abiRef}.json`;
}

export function generatedChainPath(chainKey: ChainKey) {
	return `${DEFINITIONS_ROOT}/generated/${chainKey}.ts`;
}

export function generatedAbiTypesPath() {
	return `${DEFINITIONS_ROOT}/generated/abi-types.ts`;
}

export function artifactPath(contractName: string) {
	return `${CONTRACTS_ROOT}/artifacts/src/${contractName}.sol/${contractName}.json`;
}
