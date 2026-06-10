import type { Address } from "viem";
import type { AbiJson, ContractName } from "./schema.js";

/** One deployed contract slot in generated chain bundles. */
export type ContractSlot = {
	readonly address: Address;
	readonly abi: AbiJson;
};

export type LatestContracts = {
	readonly FSEnvelopeRegistry: ContractSlot;
	readonly FSPaymentValidator: ContractSlot;
	readonly FSAttachmentRelease: ContractSlot;
	readonly MockUSDC?: ContractSlot;
};

export type HistoricalAbiSlot = {
	readonly name: ContractName;
	readonly abi: AbiJson;
};

/** Shape enforced on auto-generated `definitions/generated/<chain>.ts`. */
export type ChainDefinitionsBundle = {
	readonly latest: LatestContracts | null;
	readonly deploymentId: string | null;
	readonly historicalByAddress: Readonly<Record<string, HistoricalAbiSlot>>;
};
