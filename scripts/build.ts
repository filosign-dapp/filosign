#!/usr/bin/env bun
/**
 * Build orchestrator for apps, libs, and the test harness.
 *
 * Usage:
 *   bun run build                      # all targets (default)
 *   bun run build -- --client
 *   bun run build -- --help
 */
import { die, runMain, scriptArgv, wantsHelp } from "./lib/cli.ts";
import { repoRoot } from "./lib/root.ts";
import { packageRunCmd } from "./lib/run.ts";
import { PACKAGE_SCOPES, resolvePackageScope } from "./lib/scopes.ts";
import { runSequentialExit } from "./lib/spawn.ts";

const rootDir = repoRoot(import.meta.url);

type Target = "react" | "client" | "astro" | "server" | "harness" | "contracts";

type TargetDef = {
	package: string;
	script: string;
	ready: boolean;
};

const TARGETS: Record<Target, TargetDef> = {
	react: {
		package: PACKAGE_SCOPES.react,
		script: "build",
		ready: false,
	},
	client: { package: PACKAGE_SCOPES.client, script: "build", ready: true },
	astro: { package: PACKAGE_SCOPES.astro, script: "build", ready: true },
	server: { package: PACKAGE_SCOPES.server, script: "compile", ready: true },
	harness: { package: "test", script: "build", ready: true },
	contracts: {
		package: PACKAGE_SCOPES.contracts,
		script: "compile",
		ready: true,
	},
};

const DEFAULT_TARGETS: Target[] = [
	"client",
	"astro",
	"server",
	"harness",
	"contracts",
];

const TARGET_FLAGS: Record<Target, string[]> = {
	react: ["--react", "--react-sdk", "--sdk", "react", "react-sdk", "sdk"],
	client: ["--client", "client"],
	astro: ["--astro", "astro"],
	server: ["--server", "server"],
	harness: ["--harness", "--test", "harness", "test"],
	contracts: ["--contracts", "contracts"],
};

const HELP = `
Filosign build orchestrator

  bun run build                 all targets below (default)

Targets (combine any):
  bun run build -- --react        SDK publish build (not wired yet)
  bun run build -- --client       Vite production build
  bun run build -- --astro        Astro static build
  bun run build -- --server       Bun compile → out/server, out/worker, out/worker-healthcheck
  bun run build -- --harness      packages/test vite build
  bun run build -- --contracts    Hardhat compile

  --test is an alias for --harness

Server/contracts use compile, not Turbo build. @filosign/shared and @filosign/crypto-utils have no Vite/Hardhat build step (crypto-utils: bun test + sync:wasm on install).
`.trim();

function resolveTargetFlag(arg: string): Target | undefined {
	for (const [target, flags] of Object.entries(TARGET_FLAGS) as [
		Target,
		string[],
	][]) {
		if (flags.includes(arg)) return target;
	}

	const key = arg.startsWith("--") ? arg.slice(2) : arg;
	const pkg = resolvePackageScope(key);
	if (!pkg) return undefined;
	for (const [target, def] of Object.entries(TARGETS) as [
		Target,
		TargetDef,
	][]) {
		if (def.package === pkg) return target;
	}
	return undefined;
}

function parseTargets(argv: string[]): Target[] {
	const selected = new Set<Target>();

	for (const arg of argv) {
		if (arg === "--help" || arg === "-h") continue;
		const target = resolveTargetFlag(arg);
		if (!target) {
			die(`Unknown target: ${arg}. Try: bun run build -- --help`);
		}
		selected.add(target);
	}

	if (selected.size === 0) return [...DEFAULT_TARGETS];
	return DEFAULT_TARGETS.filter((t) => selected.has(t));
}

function buildCommands(targets: Target[]): string[][] {
	const cmds: string[][] = [];

	for (const target of targets) {
		const def = TARGETS[target];
		if (!def.ready) {
			die(
				`${def.package} has no build script yet — add "build" to packages/react-sdk/package.json when publishing.`,
			);
		}
		cmds.push(packageRunCmd(rootDir, def.package, def.script));
	}

	return cmds;
}

runMain(async () => {
	const argv = scriptArgv();

	if (wantsHelp(argv)) {
		console.log(HELP);
		process.exit(0);
	}

	const targets = parseTargets(argv);
	const cmds = buildCommands(targets);

	if (cmds.length === 0) die("No build targets selected");

	await runSequentialExit(rootDir, cmds);
});
