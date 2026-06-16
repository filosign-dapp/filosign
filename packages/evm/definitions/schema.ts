import { getAddress, isAddress } from "viem";
import z from "zod";

export const CONTRACT_NAMES = [
	"FSEnvelopeRegistry",
	"FSPaymentValidator",
	"FSAttachmentRelease",
	"MockUSDC",
] as const;

export type ContractName = (typeof CONTRACT_NAMES)[number];

const zEvmAddress = () =>
	z
		.string()
		.refine((val) => isAddress(val), { error: "Invalid Ethereum address" })
		.transform((val) => getAddress(val));

/** SHA-256 hex of normalized ABI JSON (64 chars, no 0x prefix). */
export const zAbiRef = () =>
	z.string().regex(/^[a-f0-9]{64}$/, { error: "Invalid abiRef" });

export const zContractName = z.enum(CONTRACT_NAMES);

export const zContractRef = z.object({
	address: zEvmAddress(),
	abiRef: zAbiRef(),
});

export const zDeploymentManifest = z.object({
	deploymentId: z.string().min(1),
	chainId: z.number().int().positive(),
	deployedAt: z.iso.datetime(),
	contracts: z.object({
		FSEnvelopeRegistry: zContractRef,
		FSPaymentValidator: zContractRef,
		FSAttachmentRelease: zContractRef,
		MockUSDC: zContractRef.optional(),
	}),
	transactions: z
		.object({
			setSatelliteContracts: z
				.string()
				.regex(/^0x[0-9a-fA-F]+$/)
				.optional(),
		})
		.optional(),
	deploy: z
		.object({
			initialRelayers: z.array(zEvmAddress()).min(1),
		})
		.optional(),
});

export type DeploymentManifest = z.infer<typeof zDeploymentManifest>;

export const zLatestPointer = z.object({
	deploymentId: z.string().min(1),
});

export type LatestPointer = z.infer<typeof zLatestPointer>;

export const zAddressIndexEntry = z.object({
	deploymentId: z.string().min(1),
	contractName: zContractName,
});

export const zAddressIndex = z.record(z.string(), zAddressIndexEntry);

export type AddressIndex = z.infer<typeof zAddressIndex>;

export const zAbiJson = z.array(z.record(z.string(), z.unknown()));

export type AbiJson = z.infer<typeof zAbiJson>;

export function parseDeploymentManifest(data: unknown): DeploymentManifest {
	const parsed = zDeploymentManifest.safeParse(data);
	if (!parsed.success) {
		throw new Error(
			`Invalid deployment manifest: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
		);
	}
	return parsed.data;
}

export function parseLatestPointer(data: unknown): LatestPointer {
	const parsed = zLatestPointer.safeParse(data);
	if (!parsed.success) {
		throw new Error(`Invalid latest pointer: ${parsed.error.message}`);
	}
	return parsed.data;
}

export function parseAddressIndex(data: unknown): AddressIndex {
	const parsed = zAddressIndex.safeParse(data);
	if (!parsed.success) {
		throw new Error(`Invalid address index: ${parsed.error.message}`);
	}
	return parsed.data;
}
