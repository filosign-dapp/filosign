import { getAddress } from "viem";
import type { ChainKey } from "../../../definitions/chain-key.js";
import {
	type ContractName,
	type DeploymentManifest,
	parseAddressIndex,
	parseDeploymentManifest,
	parseLatestPointer,
} from "../../../definitions/schema.js";
import { writeAbiToStore } from "./abi-store.js";
import { addressIndexPath, latestPointerPath, manifestPath } from "./paths.js";

export type DeployedContractBundle = {
	name: ContractName;
	address: `0x${string}`;
	abi: unknown;
};

export function deploymentIdNow(date = new Date()): string {
	return date
		.toISOString()
		.replace(/\.\d{3}Z$/, "Z")
		.replace(/[-:]/g, "");
}

export async function persistDeployment(args: {
	chainKey: ChainKey;
	chainId: number;
	deploymentId?: string;
	deployedAt?: string;
	contracts: DeployedContractBundle[];
	transactions?: DeploymentManifest["transactions"];
}) {
	const deploymentId = args.deploymentId ?? deploymentIdNow();
	const deployedAt = args.deployedAt ?? new Date().toISOString();

	const manifestContracts: Partial<
		Record<ContractName, DeploymentManifest["contracts"][ContractName]>
	> = {};

	for (const item of args.contracts) {
		const abiRef = await writeAbiToStore(item.abi);
		manifestContracts[item.name] = {
			address: getAddress(item.address),
			abiRef,
		};
	}

	const required: ContractName[] = [
		"FSEnvelopeRegistry",
		"FSPaymentValidator",
		"FSAttachmentRelease",
	];
	for (const name of required) {
		if (!manifestContracts[name]) {
			throw new Error(`Missing required contract in deployment: ${name}`);
		}
	}

	const manifest: DeploymentManifest = {
		deploymentId,
		chainId: args.chainId,
		deployedAt,
		contracts: manifestContracts as DeploymentManifest["contracts"],
		...(args.transactions ? { transactions: args.transactions } : {}),
	};
	parseDeploymentManifest(manifest);

	await Bun.write(
		manifestPath(args.chainKey, deploymentId),
		`${JSON.stringify(manifest, null, 2)}\n`,
	);

	await Bun.write(
		latestPointerPath(args.chainKey),
		`${JSON.stringify({ deploymentId }, null, 2)}\n`,
	);

	let index: Record<
		string,
		{ deploymentId: string; contractName: ContractName }
	> = {};
	const indexFile = Bun.file(addressIndexPath(args.chainKey));
	if (await indexFile.exists()) {
		index = parseAddressIndex(await indexFile.json());
	}

	for (const item of args.contracts) {
		index[getAddress(item.address).toLowerCase()] = {
			deploymentId,
			contractName: item.name,
		};
	}

	await Bun.write(
		addressIndexPath(args.chainKey),
		`${JSON.stringify(index, null, 2)}\n`,
	);

	return { deploymentId, manifest };
}

export async function readLatestManifest(
	chainKey: ChainKey,
): Promise<DeploymentManifest | null> {
	const pointerFile = Bun.file(latestPointerPath(chainKey));
	if (!(await pointerFile.exists())) return null;
	const { deploymentId } = parseLatestPointer(await pointerFile.json());
	const manifestFile = Bun.file(manifestPath(chainKey, deploymentId));
	if (!(await manifestFile.exists())) return null;
	return parseDeploymentManifest(await manifestFile.json());
}

export async function readAddressIndex(chainKey: ChainKey) {
	const file = Bun.file(addressIndexPath(chainKey));
	if (!(await file.exists())) return {};
	return parseAddressIndex(await file.json());
}

export async function readManifest(
	chainKey: ChainKey,
	deploymentId: string,
): Promise<DeploymentManifest> {
	return parseDeploymentManifest(
		await Bun.file(manifestPath(chainKey, deploymentId)).json(),
	);
}
