/**
 * Verify latest deployment on Basescan. Run after `hardhat run deploy.ts` completes
 * (not from inside deploy.ts - nested Hardhat CLI crashes under Bun source-map).
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ChainKey } from "../definitions/chain-key.js";
import { readLatestManifest } from "./lib/definitions/persist-deployment.js";
import { contractsPackageDir } from "./lib/repo-paths.js";

const NETWORK_BY_CHAIN: Record<Exclude<ChainKey, "local">, string> = {
	testnet: "baseSepolia",
	mainnet: "base",
};

type VerifyStep = {
	label: string;
	address: string;
	constructorArgs: unknown[];
};

/** Hardhat cannot encode arrays from CLI; always pass a temp --constructor-args module. */
async function writeConstructorArgsModule(
	constructorArgs: unknown[],
): Promise<string> {
	const tempDir = await mkdtemp(path.join(os.tmpdir(), "filosign-verify-"));
	const modulePath = path.join(tempDir, "constructor-args.cjs");
	await writeFile(
		modulePath,
		`module.exports = ${JSON.stringify(constructorArgs)};\n`,
	);
	return modulePath;
}

async function verifyContract(args: {
	network: string;
	step: VerifyStep;
}): Promise<boolean> {
	const modulePath = await writeConstructorArgsModule(
		args.step.constructorArgs,
	);

	try {
		const proc = Bun.spawn({
			cmd: [
				"bunx",
				"hardhat",
				"verify",
				"--network",
				args.network,
				"--constructor-args",
				modulePath,
				args.step.address,
				"--force",
			],
			cwd: contractsPackageDir(),
			stdout: "inherit",
			stderr: "inherit",
			env: process.env,
		});
		const code = (await proc.exited) ?? 1;
		return code === 0;
	} finally {
		await rm(path.dirname(modulePath), { recursive: true, force: true });
	}
}

export async function verifyLatestDeployment(
	chainKey: Exclude<ChainKey, "local">,
): Promise<boolean> {
	if (!process.env.ETHERSCAN_API_KEY?.trim()) {
		console.log("Skipping block explorer verify (ETHERSCAN_API_KEY not set)");
		return true;
	}

	const manifest = await readLatestManifest(chainKey);
	if (!manifest) {
		console.warn("verify-deployment: no latest manifest for", chainKey);
		return false;
	}

	const initialRelayers = manifest.deploy?.initialRelayers;
	if (!initialRelayers?.length) {
		throw new Error(
			`verify-deployment: manifest ${manifest.deploymentId} missing deploy.initialRelayers`,
		);
	}

	const network = NETWORK_BY_CHAIN[chainKey];
	const registry = manifest.contracts.FSEnvelopeRegistry.address;
	const validator = manifest.contracts.FSPaymentValidator.address;
	const attachment = manifest.contracts.FSAttachmentRelease.address;
	const chainId = String(manifest.chainId);

	console.log(
		`Verifying ${chainKey} deployment ${manifest.deploymentId} on ${network}…`,
	);

	const steps: VerifyStep[] = [
		{
			label: "FSEnvelopeRegistry",
			address: registry,
			constructorArgs: [initialRelayers],
		},
		{
			label: "FSPaymentValidator",
			address: validator,
			constructorArgs: [registry, chainId],
		},
		{
			label: "FSAttachmentRelease",
			address: attachment,
			constructorArgs: [registry, chainId],
		},
	];

	let failed = 0;
	for (const step of steps) {
		const ok = await verifyContract({ network, step });
		if (!ok) {
			console.warn(`Failed to verify ${step.label} at ${step.address}`);
			failed += 1;
		}
		await Bun.sleep(1_000);
	}
	if (failed > 0) {
		console.warn(
			`Block explorer verify: ${failed}/3 contract(s) failed (on-chain deploy is still valid)`,
		);
		return false;
	}

	console.log(`Contracts verified on ${network} block explorer`);
	return true;
}

async function main() {
	const chainKey = process.argv[2];
	if (chainKey !== "testnet" && chainKey !== "mainnet") {
		console.error(
			"Usage: bun run scripts/verify-deployment.ts <testnet|mainnet>",
		);
		process.exit(1);
	}

	const ok = await verifyLatestDeployment(chainKey);
	process.exit(ok ? 0 : 1);
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
