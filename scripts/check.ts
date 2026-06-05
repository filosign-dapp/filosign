#!/usr/bin/env bun
/**
 * Quality checks: Biome (lint / CI) + Turbo check-types.
 *
 * Usage:
 *   bun run check                 # --lint + --types (default; Biome --write)
 *   bun run check -- --ci         # Biome read-only (CI / verify)
 *   bun run check -- --types      # Turbo check-types (all @filosign/*)
 *   bun run check -- --types server
 *   bun run check -- --lint --ci --types
 *   bun run check -- --help
 */
import { die, runMain, scriptArgv, wantsHelp } from "./lib/cli.ts";
import { repoRoot } from "./lib/root.ts";
import { parsePackageFilter } from "./lib/scopes.ts";
import { runSequentialExit } from "./lib/spawn.ts";

const rootDir = repoRoot(import.meta.url);

type Step = "lint" | "ci" | "types";

const STEP_FLAGS: Record<Step, string[]> = {
	lint: ["--lint", "lint"],
	ci: ["--ci", "ci"],
	types: ["--types", "types"],
};

const HELP = `
Filosign check orchestrator

  bun run check                 Biome --write + Turbo check-types (default)

Steps (combine any):
  bun run check -- --lint       Biome check --write (same as default)
  bun run check -- --ci         Biome read-only (use in CI; no file changes)
  bun run check -- --types      Turbo check-types (@filosign/*)

Scoped types (optional package name; only applies with --types):
  bun run check -- --types server
  bun run check -- server         lint + types for @filosign/server

Biome always runs on the whole repo (root biome.json).
Types also run \`tsc -p scripts/tsconfig.json\` (repo orchestrators under \`scripts/\`) plus Turbo \`check-types\` per workspace package.
`.trim();

function parseSteps(argv: string[]): { steps: Set<Step>; scopeArgv: string[] } {
	const steps = new Set<Step>();
	const scopeArgv: string[] = [];

	for (const arg of argv) {
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
		if (!matched) scopeArgv.push(arg);
	}

	if (steps.size === 0) {
		steps.add("lint");
		steps.add("types");
	}

	return { steps, scopeArgv };
}

function buildCommands(steps: Set<Step>, typesFilter: string): string[][] {
	const cmds: string[][] = [];

	if (steps.has("lint")) {
		cmds.push(["bunx", "biome", "check", "--write", "."]);
		cmds.push(["bun", "scripts/audit-errors.ts", "--strict"]);
	}
	if (steps.has("ci")) {
		cmds.push(["bunx", "biome", "check", "."]);
		cmds.push(["bun", "scripts/audit-errors.ts", "--strict"]);
	}
	if (steps.has("types")) {
		cmds.push(["bunx", "tsc", "--noEmit", "-p", "scripts/tsconfig.json"]);
		cmds.push([
			"bunx",
			"turbo",
			"run",
			"check-types",
			`--filter=${typesFilter}`,
		]);
	}

	return cmds;
}

runMain(async () => {
	const argv = scriptArgv();

	if (wantsHelp(argv)) {
		console.log(HELP);
		process.exit(0);
	}

	const { steps, scopeArgv } = parseSteps(argv);
	const typesFilter = steps.has("types")
		? parsePackageFilter(scopeArgv, die)
		: parsePackageFilter([], die);

	const cmds = buildCommands(steps, typesFilter);
	await runSequentialExit(rootDir, cmds);
});
