#!/usr/bin/env bun
/**
 * Contracts orchestrator (@filosign/contracts + DB when migrating).
 *
 * Usage:
 *   bun run contracts -- compile | test | node
 *   bun run contracts -- --migrate --local|testnet|mainnet
 *   bun run contracts -- --help
 */
import { die, exitOnHelpOrEmpty, runMain, scriptArgv } from "./lib/cli.ts";
import { repoRoot } from "./lib/root.ts";
import { packageRunCmd } from "./lib/run.ts";
import { runInheritExit, runSequentialExit } from "./lib/spawn.ts";

const rootDir = repoRoot(import.meta.url);
const PACKAGE = "@filosign/contracts";

type Profile = "local" | "testnet" | "mainnet";

const HELP = `
Filosign contracts orchestrator

Utilities (@filosign/contracts):
  bun run contracts -- compile
  bun run contracts -- test              compile + Hardhat tests
  bun run contracts -- node              Hardhat local node

Migrate (deploy contracts, then sync DB schema):
  bun run contracts -- --migrate --local      (deploys + purges & pushes local DB)
  bun run contracts -- --migrate --testnet    (deploys + pushes staging DB schema)
  bun run contracts -- --migrate --mainnet    (deploys + pushes production DB schema)

Profiles: local (.env.local), testnet (.env.staging chain deploy), mainnet (.env.production) in apps/contracts
`.trim();

const UTILITY_COMMANDS = {
	compile: "compile",
	test: "test",
	node: "node",
} as const;

type UtilityCommand = keyof typeof UTILITY_COMMANDS;

function deployScript(profile: Profile): string {
	switch (profile) {
		case "local":
			return "deploy:local";
		case "testnet":
			return "deploy:testnet";
		case "mainnet":
			return "deploy:mainnet";
	}
}

function dbCmd(action: "push" | "purge", profile: Profile): string[] {
	return ["bun", "run", "db", "--", action, profile];
}

function parseArgv(argv: string[]) {
	let migrate = false;
	let profile: Profile | undefined;
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

function requireProfile(profile: Profile | undefined): Profile {
	if (profile === "local" || profile === "testnet" || profile === "mainnet") {
		return profile;
	}
	die("Pass a profile: --local, --testnet, or --mainnet");
}

async function runMigrate(profile: Profile) {
	const steps: string[][] = [
		packageRunCmd(rootDir, PACKAGE, deployScript(profile)),
	];

	if (profile === "local") {
		steps.push(dbCmd("purge", "local"));
	} else if (profile === "testnet") {
		steps.push(dbCmd("push", "staging"));
	} else if (profile === "mainnet") {
		steps.push(dbCmd("push", "production"));
	}

	await runSequentialExit(rootDir, steps);
}

runMain(async () => {
	const argv = scriptArgv();
	exitOnHelpOrEmpty(HELP, argv);

	const { migrate, profile, utility } = parseArgv(argv);

	if (utility) {
		if (migrate) die(`Do not combine --migrate with ${utility}`);
		await runInheritExit(
			rootDir,
			packageRunCmd(rootDir, PACKAGE, UTILITY_COMMANDS[utility]),
		);
	}

	if (!migrate) {
		console.error("Missing --migrate. Try: bun run contracts -- --help\n");
		console.log(HELP);
		process.exit(1);
	}

	const p = requireProfile(profile);

	await runMigrate(p);
});
