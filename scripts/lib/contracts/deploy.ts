import {
	DEPLOY_ENV_PROFILE,
	DEPLOY_NETWORK,
	type DeployProfile,
	definitionsEnvFile,
	deployScriptPath,
	packageDir,
} from "../package-paths.ts";
import { runInheritExit } from "../spawn.ts";

export async function runDeploy(
	rootDir: string,
	profile: DeployProfile,
): Promise<never> {
	const contractsDir = packageDir(rootDir, "@filosign/contracts");
	const envFile = definitionsEnvFile(rootDir, DEPLOY_ENV_PROFILE[profile]);
	const script = deployScriptPath(rootDir);
	const network = DEPLOY_NETWORK[profile];

	return runInheritExit(contractsDir, [
		"bun",
		`--env-file=${envFile}`,
		"--bun",
		"hardhat",
		"run",
		script,
		"--network",
		network,
	]);
}
