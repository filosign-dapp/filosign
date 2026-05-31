#!/usr/bin/env bun
/**
 * Database ops via @filosign/server scripts.
 *
 * Usage:
 *   bun run db -- push local
 *   bun run db -- push staging
 *   bun run db -- push sandbox
 *   bun run db -- push production
 *   bun run db -- purge local
 *   bun run db -- purge staging
 *   bun run db -- purge sandbox
 *   bun run db -- --help
 */

import { die, exitOnHelpOrEmpty, runMain, scriptArgv } from "./lib/cli.ts";
import { repoRoot } from "./lib/root.ts";
import { packageRunCmd } from "./lib/run.ts";
import { runInheritExit, runSequentialExit } from "./lib/spawn.ts";

const rootDir = repoRoot(import.meta.url);

const HELP = `
Filosign database orchestrator (@filosign/server)

  bun run db -- push local        drizzle push (.env.local)
  bun run db -- push staging      drizzle push (Infisical staging)
  bun run db -- push sandbox      drizzle push (Infisical sandbox)
  bun run db -- push production   drizzle push (Infisical prod)
  bun run db -- purge local       clear schema + push (.env.local)
  bun run db -- purge staging     clear schema + push (Infisical staging)
  bun run db -- purge sandbox     clear schema + push (Infisical sandbox)
  bun run db -- grant-plan local   Teams Pro for PLATFORM_ADMIN_EMAILS (.env.local)
  bun run db -- grant-plan staging Infisical staging
  bun run db -- grant-plan sandbox Infisical sandbox
`.trim();

type Action = "push" | "purge" | "grant-plan";
type Profile = "local" | "staging" | "sandbox" | "production";

function scriptFor(action: "push" | "purge", profile: Profile): string {
	return `db:${action}:${profile}`;
}

function grantPlanScript(profile: Exclude<Profile, "production">): string {
	return `db:grant-plan:${profile}`;
}

runMain(async () => {
	const server = "@filosign/server";
	const argv = scriptArgv();
	exitOnHelpOrEmpty(HELP, argv);

	const action = argv[0] as Action;
	const profile = argv[1] as Profile;

	if (action !== "push" && action !== "purge" && action !== "grant-plan") {
		die(`Unknown action: ${action}`);
	}
	if (action === "grant-plan") {
		if (profile === "production") {
			die(
				"grant-plan is not wired for production; use staging or run grant-admin-plan manually",
			);
		}
		if (profile !== "local" && profile !== "staging" && profile !== "sandbox") {
			die(`Unknown profile: ${profile}`);
		}
		await runInheritExit(
			rootDir,
			packageRunCmd(rootDir, server, grantPlanScript(profile)),
		);
		return;
	}
	if (
		profile !== "local" &&
		profile !== "staging" &&
		profile !== "sandbox" &&
		profile !== "production"
	) {
		die(`Unknown profile: ${profile}`);
	}
	if (action === "purge" && profile === "production") {
		die('Purge is not allowed for the "production" profile');
	}

	if (action === "purge") {
		await runSequentialExit(rootDir, [
			packageRunCmd(rootDir, server, scriptFor("purge", profile)),
			packageRunCmd(rootDir, server, scriptFor("push", profile)),
		]);
		return;
	}

	await runInheritExit(
		rootDir,
		packageRunCmd(rootDir, server, scriptFor("push", profile)),
	);
});
