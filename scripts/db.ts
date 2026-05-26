#!/usr/bin/env bun
/**
 * Database ops via @filosign/server scripts.
 *
 * Usage:
 *   bun run db -- push local
 *   bun run db -- push testnet
 *   bun run db -- purge local      clear schema + drizzle push (.env.local)
 *   bun run db -- purge testnet    clear schema + drizzle push (.env.staging)
 *   bun run db -- --help
 */

import { die, exitOnHelpOrEmpty, runMain, scriptArgv } from "./lib/cli.ts";
import { repoRoot } from "./lib/root.ts";
import { packageRunCmd } from "./lib/run.ts";
import { runInheritExit, runSequentialExit } from "./lib/spawn.ts";

const rootDir = repoRoot(import.meta.url);

const HELP = `
Filosign database orchestrator (@filosign/server)

  bun run db -- push local      drizzle push (.env.local)
  bun run db -- push testnet    drizzle push (.env.staging)
  bun run db -- purge local     clear schema + Dragonfly flush, then push (.env.local)
  bun run db -- purge testnet   clear schema, then push (.env.staging)
`.trim();

type Action = "push" | "purge";
type Profile = "local" | "testnet";

function scriptFor(action: Action, profile: Profile): string {
	return `db:${action}:${profile}`;
}

runMain(async () => {
	const argv = scriptArgv();
	exitOnHelpOrEmpty(HELP, argv);

	const action = argv[0] as Action;
	const profile = argv[1] as Profile;

	if (action !== "push" && action !== "purge") {
		die(`Unknown action: ${action}`);
	}
	if (profile !== "local" && profile !== "testnet") {
		die(`Unknown profile: ${profile}`);
	}

	const server = "@filosign/server";

	if (action === "purge") {
		await runSequentialExit(rootDir, [
			packageRunCmd(rootDir, server, scriptFor("purge", profile)),
			packageRunCmd(rootDir, server, scriptFor("push", profile)),
		]);
	}

	await runInheritExit(
		rootDir,
		packageRunCmd(rootDir, server, scriptFor(action, profile)),
	);
});
