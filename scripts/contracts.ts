#!/usr/bin/env bun
import { die, exitOnHelpOrEmpty, runMain, scriptArgv } from "./lib/cli.ts";
/**
 * Contracts orchestrator (@filosign/contracts + @filosign/evm + DB when migrating).
 *
 * Usage:
 *   bun run contracts -- compile | test | node
 *   bun run contracts -- --migrate --local|testnet|mainnet
 *   bun run contracts -- --help
 */
import { runDeploy } from "./lib/contracts/deploy.ts";
import type { DeployProfile } from "./lib/package-paths.ts";
import { repoRoot } from "./lib/root.ts";
import { packageRunCmd } from "./lib/run.ts";
import { runInherit, runInheritExit, runSequentialExit } from "./lib/spawn.ts";

const rootDir = repoRoot(import.meta.url);
const CONTRACTS_PKG = "@filosign/contracts";
const EVM_PKG = "@filosign/evm";

/** @filosign/server DB orchestrator profiles (see scripts/db.ts) */
type DbProfile = "local" | "staging" | "sandbox" | "production";

const HELP = `
Filosign contracts orchestrator

Utilities:
  bun run contracts -- compile              OSS compile + private gen:definitions
  bun run contracts -- test                 OSS Hardhat tests
  bun run contracts -- node                 Hardhat local node (OSS package)

Migrate (deploy contracts; testnet optionally syncs staging DB via push):
  bun run contracts -- --migrate --local      (OSS compile + deploy to Hardhat; no test gate)
  bun run contracts -- --migrate --testnet    (deploys + db push staging)
  bun run contracts -- --migrate --mainnet    (deploy only — run prod --migrate separately)

Local DB: bun run db -- push local  ·  bun run prod -- --migrate  ·  bun run db -- purge local

Env profiles: local (.env.local), testnet (.env.staging), mainnet (.env.production) in packages/evm
`.trim();

const UTILITY_COMMANDS = {
	compile: "compile",
	test: "test",
	node: "node",
} as const;

type UtilityCommand = keyof typeof UTILITY_COMMANDS;

function dbCmd(action: "push" | "purge", dbProfile: DbProfile): string[] {
	return ["bun", "run", "db", "--", action, dbProfile];
}

function parseArgv(argv: string[]) {
	let migrate = false;
	let profile: DeployProfile | undefined;
	let utility: UtilityCommand | undefined;

	for (const arg of argv) {
		if (arg === "--migrate") migrate = true;
		if (arg === "--local") profile = "local";
		if (arg === "--testnet") profile = "testnet";
		if (arg === "--mainnet") profile = "mainnet";
		if (arg in UTILITY_COMMANDS) utility = arg as UtilityCommand;
	}

	return { migrate, profile, utility };
}

function requireProfile(profile: DeployProfile | undefined): DeployProfile {
	if (profile === "local" || profile === "testnet" || profile === "mainnet") {
		return profile;
	}
	die("Pass a profile: --local, --testnet, or --mainnet");
}

async function runOssCompile(): Promise<number> {
	return runInherit(rootDir, packageRunCmd(rootDir, CONTRACTS_PKG, "compile"));
}

async function runCompile(): Promise<never> {
	return runSequentialExit(rootDir, [
		packageRunCmd(rootDir, CONTRACTS_PKG, "compile"),
		packageRunCmd(rootDir, EVM_PKG, "gen:definitions"),
	]);
}

async function runTest(): Promise<never> {
	return runInheritExit(rootDir, packageRunCmd(rootDir, CONTRACTS_PKG, "test"));
}

async function runMigrate(profile: DeployProfile): Promise<never> {
	if (profile === "local") {
		const compileCode = await runOssCompile();
		if (compileCode !== 0) process.exit(compileCode);
	} else {
		const testCode = await runInherit(
			rootDir,
			packageRunCmd(rootDir, CONTRACTS_PKG, "test"),
		);
		if (testCode !== 0) process.exit(testCode);
	}

	await runDeploy(rootDir, profile);

	if (profile === "testnet") {
		return runInheritExit(rootDir, dbCmd("push", "staging"));
	}
	process.exit(0);
}

runMain(async () => {
	const argv = scriptArgv();
	exitOnHelpOrEmpty(HELP, argv);

	const { migrate, profile, utility } = parseArgv(argv);

	if (utility) {
		if (migrate) die(`Do not combine --migrate with ${utility}`);
		if (utility === "compile") {
			await runCompile();
			return;
		}
		if (utility === "test") {
			await runTest();
			return;
		}
		await runInheritExit(
			rootDir,
			packageRunCmd(rootDir, CONTRACTS_PKG, UTILITY_COMMANDS[utility]),
		);
		return;
	}

	if (!migrate) {
		console.error("Missing --migrate. Try: bun run contracts -- --help\n");
		console.log(HELP);
		process.exit(1);
	}

	const p = requireProfile(profile);

	await runMigrate(p);
});
