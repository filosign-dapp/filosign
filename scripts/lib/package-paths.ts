import path from "node:path";
import { PACKAGE_DIRS } from "./run.ts";

export type DefinitionsEnvProfile = "local" | "staging" | "production";

const ENV_FILES: Record<DefinitionsEnvProfile, string> = {
	local: ".env.local",
	staging: ".env.staging",
	production: ".env.production",
};

export type WorkspacePackage = keyof typeof PACKAGE_DIRS;

export function packageDir(
	rootDir: string,
	packageName: WorkspacePackage,
): string {
	const rel = PACKAGE_DIRS[packageName];
	if (!rel) {
		throw new Error(`Unknown workspace package: ${packageName}`);
	}
	return path.join(rootDir, rel);
}

export function definitionsEnvFile(
	rootDir: string,
	profile: DefinitionsEnvProfile,
): string {
	return path.join(packageDir(rootDir, "@filosign/evm"), ENV_FILES[profile]);
}

export function deployScriptPath(rootDir: string): string {
	return path.join(packageDir(rootDir, "@filosign/evm"), "scripts/deploy.ts");
}

export type DeployProfile = "local" | "testnet" | "mainnet";

export const DEPLOY_ENV_PROFILE: Record<DeployProfile, DefinitionsEnvProfile> =
	{
		local: "local",
		testnet: "staging",
		mainnet: "production",
	};

export const DEPLOY_NETWORK: Record<DeployProfile, string> = {
	local: "localhost",
	testnet: "baseSepolia",
	mainnet: "base",
};
