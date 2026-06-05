#!/usr/bin/env bun
/**
 * Database ops via @filosign/server scripts.
 *
 * Usage:
 *   bun run db -- push local|staging
 *   bun run db -- migrate local|staging|sandbox
 *   bun run db -- purge local|staging|sandbox
 *   bun run db -- grant-plan local|staging|sandbox
 *   bun run db -- --help
 */

import { die, exitOnHelpOrEmpty, runMain, scriptArgv } from "./lib/cli.ts";
import { repoRoot } from "./lib/root.ts";
import { packageRunCmd } from "./lib/run.ts";
import { runInheritExit, runSequentialExit } from "./lib/spawn.ts";

const rootDir = repoRoot(import.meta.url);

const HELP = `
Filosign database orchestrator (@filosign/server)

  bun run db -- push local        drizzle-kit push (.env.local)
  bun run db -- push staging      drizzle-kit push (Infisical staging)
  bun run db -- migrate local     drizzle-kit migrate (.env.local) — optional; dev uses push
  bun run db -- migrate staging   drizzle-kit migrate (Infisical staging) — optional
  bun run db -- migrate sandbox   drizzle-kit migrate (Infisical sandbox)
  bun run prod -- --migrate       production (SSH tunnel) — see bun run prod -- --help
  bun run db -- purge local       clear schema + push (.env.local)
  bun run db -- purge staging     clear schema + push (Infisical staging)
  bun run db -- purge sandbox     clear schema + migrate (Infisical sandbox)
  bun run db -- grant-plan local   Teams Pro for PLATFORM_ADMIN_EMAILS (.env.local)
  bun run db -- grant-plan staging Infisical staging
  bun run db -- grant-plan sandbox Infisical sandbox

local / staging: push (or purge → push) — no generate step.
sandbox: generate → commit apps/server/drizzle/ → migrate (push blocked). Production: bun run prod -- --migrate.
`.trim();

type Action = "push" | "purge" | "grant-plan" | "migrate";
type Profile = "local" | "staging" | "sandbox" | "production";
type PushProfile = "local" | "staging";
type PurgeProfile = "local" | "staging" | "sandbox";

function pushScript(profile: PushProfile): string {
	return `db:push:${profile}`;
}

function migrateScript(profile: Profile): string {
	return `db:migrate:${profile}`;
}

function purgeScript(profile: Exclude<Profile, "production">): string {
	return `db:purge:${profile}`;
}

function grantPlanScript(profile: Exclude<Profile, "production">): string {
	return `db:grant-plan:${profile}`;
}

function assertProfile(profile: string): Profile {
	if (
		profile === "local" ||
		profile === "staging" ||
		profile === "sandbox" ||
		profile === "production"
	) {
		return profile;
	}
	die(`Unknown profile: ${profile}`);
}

function assertPushAllowed(profile: Profile): asserts profile is PushProfile {
	if (profile === "production") {
		die(
			"Direct push to production is blocked. Use bun run prod -- --migrate after db:generate and committing apps/server/drizzle/.",
		);
	}
	if (profile === "sandbox") {
		die(
			'Direct push to sandbox is blocked. Iterate with push on local/staging, then db:generate and "bun run db -- migrate sandbox".',
		);
	}
}

function schemaApplyAfterPurge(profile: PurgeProfile): string {
	if (profile === "sandbox") {
		return migrateScript("sandbox");
	}
	return pushScript(profile);
}

runMain(async () => {
	const server = "@filosign/server";
	const argv = scriptArgv();
	exitOnHelpOrEmpty(HELP, argv);

	const action = argv[0] as Action;
	const profile = assertProfile(argv[1] ?? "");

	if (
		action !== "push" &&
		action !== "purge" &&
		action !== "grant-plan" &&
		action !== "migrate"
	) {
		die(`Unknown action: ${action}`);
	}

	if (action === "grant-plan") {
		if (profile === "production") {
			die(
				"grant-plan is not wired for production; use staging or run grant-admin-plan manually",
			);
		}
		await runInheritExit(
			rootDir,
			packageRunCmd(rootDir, server, grantPlanScript(profile)),
		);
		return;
	}

	if (action === "purge") {
		if (profile === "production") {
			die('Purge is not allowed for the "production" profile');
		}
		const purgeProfile = profile as PurgeProfile;
		await runSequentialExit(rootDir, [
			packageRunCmd(rootDir, server, purgeScript(purgeProfile)),
			packageRunCmd(rootDir, server, schemaApplyAfterPurge(purgeProfile)),
		]);
		return;
	}

	if (action === "migrate") {
		if (profile === "production") {
			die('Use "bun run prod -- --migrate" for production');
		}
		await runInheritExit(
			rootDir,
			packageRunCmd(rootDir, server, migrateScript(profile)),
		);
		return;
	}

	if (action === "push") {
		assertPushAllowed(profile);
		await runInheritExit(
			rootDir,
			packageRunCmd(rootDir, server, pushScript(profile)),
		);
		return;
	}

	die(`Unknown action: ${action}`);
});
