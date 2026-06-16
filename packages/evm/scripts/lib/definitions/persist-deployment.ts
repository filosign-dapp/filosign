import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { getAddress } from "viem";
import {
	type ChainKey,
	LOCAL_DEPLOYMENT_ID,
} from "../../../definitions/chain-key.js";
import {
	type ContractName,
	type DeploymentManifest,
	parseAddressIndex,
	parseDeploymentManifest,
	parseLatestPointer,
} from "../../../definitions/schema.js";
import { writeAbiToStore } from "./abi-store.js";
import {
	addressIndexPath,
	chainDir,
	latestPointerPath,
	manifestPath,
} from "./paths.js";

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

async function pruneStaleLocalDeployments(keepDeploymentId: string) {
	const deploymentsRoot = path.join(chainDir("local"), "deployments");
	let names: string[];
	try {
		names = await readdir(deploymentsRoot);
	} catch {
		return;
	}
	await Promise.all(
		names
			.filter((name) => name !== keepDeploymentId)
			.map((name) =>
				rm(path.join(deploymentsRoot, name), {
					recursive: true,
					force: true,
				}),
			),
	);
}

export async function persistDeployment(args: {
	chainKey: ChainKey;
	chainId: number;
	deploymentId?: string;
	deployedAt?: string;
	contracts: DeployedContractBundle[];
	transactions?: DeploymentManifest["transactions"];
	deploy?: DeploymentManifest["deploy"];
}) {
	const isLocal = args.chainKey === "local";
	const deploymentId =
		args.deploymentId ?? (isLocal ? LOCAL_DEPLOYMENT_ID : deploymentIdNow());
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
		...(args.deploy ? { deploy: args.deploy } : {}),
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
	if (!isLocal) {
		const indexFile = Bun.file(addressIndexPath(args.chainKey));
		if (await indexFile.exists()) {
			index = parseAddressIndex(await indexFile.json());
		}
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

	if (isLocal) {
		await pruneStaleLocalDeployments(deploymentId);
	}

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
