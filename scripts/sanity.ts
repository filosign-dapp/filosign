#!/usr/bin/env bun
/**
 * Sanity gate: build + check + tests + Hardhat.
 *
 * Usage:
 *   bun run sanity                 # build + check (lint + types) + unit tests + Hardhat
 *   bun run sanity -- --ci         # same, but Biome read-only (pre-push / CI)
 *   bun run sanity -- --check      # check only
 *   bun run sanity -- --test       # test only (excludes contracts)
 *   bun run sanity -- --contracts  # Hardhat only
 *   bun run sanity -- --build      # build only
 *   bun run sanity -- --help
 */
import { die, runMain, scriptArgv, wantsHelp } from "./lib/cli.ts";
import { repoRoot } from "./lib/root.ts";
import { runSequentialExit } from "./lib/spawn.ts";

const rootDir = repoRoot(import.meta.url);

const UNIT_TEST_FILTER = "@filosign/*";
const EXCLUDE_CONTRACTS = "!@filosign/contracts";

type Step = "build" | "check" | "test" | "contracts";

const STEP_FLAGS: Record<Step, string[]> = {
	build: ["--build", "build"],
	check: ["--check", "check"],
	test: ["--test", "test"],
	contracts: ["--contracts", "contracts"],
};

const CI_FLAGS = ["--ci", "ci"] as const;

const HELP = `
Filosign sanity orchestrator

  bun run sanity                 build + check (lint + types) + unit tests + Hardhat
  bun run sanity -- --ci         build + check (read-only Biome + types) + tests + Hardhat

Steps only (combine any):
  bun run sanity -- --build
  bun run sanity -- --check
  bun run sanity -- --test
  bun run sanity -- --test server   forwarded to test orchestrator
  bun run sanity -- --contracts     Hardhat only
`.trim();

function isCiFlag(arg: string): boolean {
	return (CI_FLAGS as readonly string[]).includes(arg);
}

function parseArgv(argv: string[]) {
	let ci = false;
	const steps = new Set<Step>();
	const passthrough: string[] = [];

	for (const arg of argv) {
		if (isCiFlag(arg)) {
			ci = true;
			continue;
		}

		let matched = false;
		for (const [step, flags] of Object.entries(STEP_FLAGS) as [
			Step,
			string[],
		][]) {
			if (flags.includes(arg)) {
				steps.add(step);
				matched = true;
				break;
			}
		}
		if (!matched) passthrough.push(arg);
	}

	if (steps.size === 0) {
		steps.add("build");
		steps.add("check");
		steps.add("test");
		steps.add("contracts");
	}

	return { steps, passthrough, ci };
}

function checkCmd(ci: boolean): string[] {
	if (ci) {
		return ["bun", "run", "check", "--", "--ci", "--types"];
	}
	return ["bun", "run", "check", "--", "--lint", "--types"];
}

function buildCmd(): string[] {
	return ["bun", "run", "build"];
}

function unitTestsCmd(): string[] {
	return [
		"bunx",
		"turbo",
		"run",
		"test",
		`--filter=${UNIT_TEST_FILTER}`,
		`--filter=${EXCLUDE_CONTRACTS}`,
	];
}

function testCmd(steps: Set<Step>, passthrough: string[]): string[] | null {
	if (!steps.has("test")) return null;

	if (passthrough.length > 0) {
		return ["bun", "run", "test", "--", ...passthrough];
	}

	return unitTestsCmd();
}

function contractsTestCmd(): string[] {
	return ["bun", "run", "contracts", "--", "test"];
}

function buildCommands(
	steps: Set<Step>,
	passthrough: string[],
	ci: boolean,
): string[][] {
	const cmds: string[][] = [];

	if (steps.has("build")) {
		cmds.push(buildCmd());
	}

	if (steps.has("check")) {
		cmds.push(checkCmd(ci));
		cmds.push(["bun", "run", "scripts/check-test-antipatterns.ts"]);
		if (ci) {
			cmds.push(["bun", "run", "--cwd", "apps/server", "db:migration:check"]);
		}
	}

	const test = testCmd(steps, passthrough);
	if (test) cmds.push(test);

	if (steps.has("contracts")) {
		cmds.push(contractsTestCmd());
	}

	return cmds;
}

runMain(async () => {
	const argv = scriptArgv();

	if (wantsHelp(argv)) {
		console.log(HELP);
		process.exit(0);
	}

	const { steps, passthrough, ci } = parseArgv(argv);
	const cmds = buildCommands(steps, passthrough, ci);

	if (cmds.length === 0) die("No sanity steps selected");

	await runSequentialExit(rootDir, cmds);
});
