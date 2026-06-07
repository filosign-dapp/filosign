import type { ChainKey } from "../../../definitions/chain-key.js";

export const DEFINITIONS_ROOT = "definitions";

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
	return `artifacts/src/${contractName}.sol/${contractName}.json`;
}
