import {
	MAINNET_CHAIN_ID,
	MAINNET_DEPLOY_CONFIRMED_ENV,
	requireMainnetDeployConfirmation,
} from "../../../packages/evm/scripts/lib/confirm-mainnet-deploy.ts";
import {
	DEPLOY_ENV_PROFILE,
	DEPLOY_NETWORK,
	type DeployProfile,
	definitionsEnvFile,
	deployScriptPath,
	packageDir,
} from "../package-paths.ts";
import { runInherit } from "../spawn.ts";
import { readLatestDeploymentId } from "./latest-deployment-id.ts";

export async function runDeploy(
	rootDir: string,
	profile: DeployProfile,
): Promise<void> {
	const contractsDir = packageDir(rootDir, "@filosign/contracts");
	const evmDir = packageDir(rootDir, "@filosign/evm");
	const envFile = definitionsEnvFile(rootDir, DEPLOY_ENV_PROFILE[profile]);
	const script = deployScriptPath(rootDir);
	const network = DEPLOY_NETWORK[profile];

	const deployEnv: Record<string, string> = {};

	if (profile === "mainnet") {
		await requireMainnetDeployConfirmation(MAINNET_CHAIN_ID);
		deployEnv[MAINNET_DEPLOY_CONFIRMED_ENV] = "1";
	}

	const deploymentIdBefore =
		profile === "testnet" || profile === "mainnet"
			? readLatestDeploymentId(rootDir, profile)
			: null;

	const deployCode = await runInherit(
		contractsDir,
		[
			"bun",
			`--env-file=${envFile}`,
			"--bun",
			"hardhat",
			"run",
			script,
			"--network",
			network,
		],
		deployEnv,
	);
	if (deployCode !== 0) process.exit(deployCode);

	if (profile === "testnet" || profile === "mainnet") {
		const deploymentIdAfter = readLatestDeploymentId(rootDir, profile);
		if (deploymentIdAfter === deploymentIdBefore) {
			console.log(
				"Skipping block explorer verify (no new deployment persisted).",
			);
			return;
		}

		const verifyCode = await runInherit(evmDir, [
			"bun",
			`--env-file=${envFile}`,
			"run",
			"scripts/verify-deployment.ts",
			profile,
		]);
		if (verifyCode !== 0) {
			console.warn(
				"Block explorer verify reported errors; on-chain deploy and definitions are still valid.",
			);
		}
	}
}
