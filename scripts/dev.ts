#!/usr/bin/env bun
/** Dev stack orchestrator. See `bun run dev -- --help` for all stacks and flags. */
import { die, runMain, scriptArgv, wantsHelp } from "./lib/cli.ts";
import { runLocalBootstrap } from "./lib/localnode.ts";
import { repoRoot } from "./lib/root.ts";
import { packageRunCmd } from "./lib/run.ts";
import { runParallelExit, type SpawnTask } from "./lib/spawn.ts";

const rootDir = repoRoot(import.meta.url);

type Profile = "local" | "staging" | "sandbox";

const PRESET_FLAGS = ["serloc", "web", "emails"] as const;

const HELP = `
bun run dev — start dev servers (bun run dev -- --help)

Stacks (pick one):
  dev                 hardhat bootstrap + server + client + astro   [.env.local]
  dev -- --serloc     hardhat bootstrap + server                    [local only]
  dev -- --web        client + astro + emails                       [:30010]
  dev -- --emails     React Email preview only                      [:30010]
  dev -- --staging    client + server    [Infisical staging; client: .env.staging]
  dev -- --sandbox    client + server    [Infisical sandbox; client: .env.sandbox]

Or mix apps:  dev -- --client  --server  --astro  [--local | --staging | --sandbox]
  (--server on --local runs with hardhat bootstrap first)
e.g. bun run dev -- --client --local

Ports:  server :3000   client :3001   astro :3002   emails :30010

Deps:  default runs \`docker compose -f deploy/compose.dev.yml up -d\` (Dragonfly :6379).  --no-deps to skip.
       --deps alone = compose only (foreground).  --deps with apps = same as default.

Local bootstrap (default \`dev\` with server): \`db purge local\`, compile, deploy contracts to Hardhat.

Presets (--serloc, --web, --emails) cannot be combined with each other or with --client / --server / --astro.
`.trim();

function parseArgv(argv: string[]) {
	const flags = new Set<string>();
	let profile: Profile | undefined;
	let withDeps = true;

	for (const arg of argv) {
		if (arg === "--help" || arg === "-h") {
			return { help: true as const, flags, profile, withDeps };
		}
		if (arg === "--local") profile = "local";
		if (arg === "--staging") profile = "staging";
		if (arg === "--sandbox") profile = "sandbox";
		if (arg === "--testnet") {
			die(
				"Removed --testnet; use --staging (internal QA) or --sandbox (public demo)",
			);
		}
		if (arg === "--full") {
			die("Removed --full; astro is included in the default bun run dev stack");
		}
		if (arg === "--deps") flags.add("deps");
		if (arg === "--no-deps") withDeps = false;
		if (arg === "--serloc") flags.add("serloc");
		if (arg === "--web") flags.add("web");
		if (arg === "--emails") flags.add("emails");
		if (arg === "--astro") flags.add("astro");
		if (arg === "--client") flags.add("client");
		if (arg === "--server") flags.add("server");
	}

	if (profile === undefined) {
		profile = "local";
	}

	return { help: false as const, flags, profile, withDeps };
}

function isDepsOnly(flags: Set<string>): boolean {
	if (!flags.has("deps")) return false;
	if (flags.has("client") || flags.has("server") || flags.has("astro")) {
		return false;
	}
	return activePresets(flags).length === 0;
}

const DEV_COMPOSE = "deploy/compose.dev.yml";

async function composeUp(rootDir: string, detached: boolean): Promise<void> {
	const cmd = detached
		? ["docker", "compose", "-f", DEV_COMPOSE, "up", "-d"]
		: ["docker", "compose", "-f", DEV_COMPOSE, "up"];
	const code = await Bun.spawn({
		cmd,
		cwd: rootDir,
		stdout: "inherit",
		stderr: "inherit",
		stdin: "inherit",
		env: process.env,
	}).exited;
	if (code !== 0) die("docker compose failed");
}

function workspaceTask(packageName: string, script: string): SpawnTask {
	return {
		label: packageName,
		cmd: packageRunCmd(rootDir, packageName, script),
	};
}

function serverDevScript(profile: Profile): string {
	return profile === "local" ? "dev:local" : `dev:${profile}`;
}

function clientDevScript(profile: Profile): string {
	return profile === "local" ? "dev:local" : `dev:${profile}`;
}

function activePresets(flags: Set<string>): string[] {
	return PRESET_FLAGS.filter((p) => flags.has(p));
}

function assertNoComponentFlags(flags: Set<string>, preset: string) {
	if (flags.has("client") || flags.has("server") || flags.has("astro")) {
		die(`Do not combine ${preset} with --client, --server, or --astro`);
	}
}

function resolveTasks(
	flags: Set<string>,
	profile: Profile | undefined,
): SpawnTask[] {
	const presets = activePresets(flags);
	if (presets.length > 1) {
		die(`Pick one preset: ${presets.map((p) => `--${p}`).join(", ")}`);
	}

	if (flags.has("serloc")) {
		assertNoComponentFlags(flags, "--serloc");
		if (profile !== "local") {
			die("--serloc is local only (bootstrap + server)");
		}
		return [workspaceTask("@filosign/server", "dev:local")];
	}

	if (flags.has("web")) {
		assertNoComponentFlags(flags, "--web");
		const p = profile ?? "local";
		return [
			workspaceTask("@filosign/client", clientDevScript(p)),
			workspaceTask("@filosign/astro", "dev:local"),
			workspaceTask("@filosign/emails", "dev"),
		];
	}

	if (flags.has("emails")) {
		assertNoComponentFlags(flags, "--emails");
		return [workspaceTask("@filosign/emails", "dev")];
	}

	const explicit =
		flags.has("client") || flags.has("server") || flags.has("astro");

	if (explicit) {
		const tasks: SpawnTask[] = [];
		const p = profile ?? "local";

		if (flags.has("client")) {
			tasks.push(workspaceTask("@filosign/client", clientDevScript(p)));
		}
		if (flags.has("server")) {
			tasks.push(workspaceTask("@filosign/server", serverDevScript(p)));
		}
		if (flags.has("astro")) {
			tasks.push(workspaceTask("@filosign/astro", "dev:local"));
		}

		if (tasks.length === 0) {
			die("Pick at least one of: --client, --server, --astro");
		}
		return tasks;
	}

	if (profile === "local") {
		return [
			workspaceTask("@filosign/server", "dev:local"),
			workspaceTask("@filosign/client", "dev:local"),
			workspaceTask("@filosign/astro", "dev:local"),
		];
	}

	if (profile === "staging" || profile === "sandbox") {
		return [
			workspaceTask("@filosign/client", clientDevScript(profile)),
			workspaceTask("@filosign/server", serverDevScript(profile)),
		];
	}

	return [];
}

function tasksIncludeServer(tasks: SpawnTask[]): boolean {
	return tasks.some((t) => t.label === "@filosign/server");
}

runMain(async () => {
	const argv = scriptArgv();
	const parsed = parseArgv(argv);

	if (parsed.help || wantsHelp(argv)) {
		console.log(HELP);
		process.exit(0);
	}

	if (isDepsOnly(parsed.flags)) {
		await composeUp(rootDir, false);
		process.exit(0);
	}

	const tasks = resolveTasks(parsed.flags, parsed.profile);

	if (tasks.length === 0) {
		console.error("Missing profile or component. Try: bun run dev -- --help\n");
		console.log(HELP);
		process.exit(1);
	}

	if (parsed.withDeps) {
		await composeUp(rootDir, true);
	}

	if (parsed.profile === "local" && tasksIncludeServer(tasks)) {
		await runLocalBootstrap(rootDir);
	}

	await runParallelExit(rootDir, tasks);
});
