#!/usr/bin/env bun
/**
 * Database ops via @filosign/server scripts.
 *
 * Usage:
 *   bun run db -- push local|staging
 *   bun run db -- generate
 *   bun run db -- migration-check [--skip-generate]
 *   bun run db -- confirm-migration-commit --staged
 *   bun run db -- verify-migrations
 *   bun run db -- migrate local|staging|sandbox|production
 *   bun run db -- purge local|staging|sandbox
 *   bun run db -- grant-plan local|staging|sandbox
 *   bun run db -- --help
 */

import { die, exitOnHelpOrEmpty, runMain, scriptArgv } from "./lib/cli.ts";
import { migrateProd } from "./lib/prod/migrate.ts";
import { repoRoot } from "./lib/root.ts";
import { packageRunCmd } from "./lib/run.ts";
import { runInheritExit, runSequentialExit } from "./lib/spawn.ts";

const rootDir = repoRoot(import.meta.url);

const HELP = `
Filosign database orchestrator (@filosign/server)

  bun run db -- push local        drizzle-kit push (.env.local)
  bun run db -- push staging      drizzle-kit push (Infisical staging)
  bun run db -- generate          drizzle-kit generate - commit apps/server/drizzle/ before migrate
  bun run db -- migration-check   journal/SQL/snapshot integrity + drizzle-kit check (CI gate)
  bun run db -- confirm-migration-commit --staged  block commit when apps/server/drizzle/ is staged (pre-commit)
  bun run db -- verify-migrations apply full chain on fresh DB + smoke columns (needs local Postgres)
  bun run db -- migrate local     drizzle-kit migrate (.env.local) - optional; dev uses push
  bun run db -- migrate staging   drizzle-kit migrate (Infisical staging) - optional
  bun run db -- migrate sandbox   drizzle-kit migrate (Infisical sandbox)
  bun run db -- migrate production drizzle-kit migrate (SSH tunnel + Infisical prod)
  bun run db -- purge local       clear schema + push (.env.local)
  bun run db -- purge staging     clear schema + push (Infisical staging)
  bun run db -- purge sandbox     clear schema + migrate (Infisical sandbox)
  bun run db -- grant-plan local   Teams Pro for PLATFORM_ADMIN_EMAILS (.env.local)
  bun run db -- grant-plan staging Infisical staging
  bun run db -- grant-plan sandbox Infisical sandbox

local / staging: push (or purge → push). Sandbox/production: generate → commit → migrate.
Production migrate needs FILOSIGN_PROD_SSH + container names in deploy/.env (see deploy/.env.example).
`.trim();

type Action =
	| "push"
	| "purge"
	| "grant-plan"
	| "migrate"
	| "generate"
	| "migration-check"
	| "confirm-migration-commit"
	| "verify-migrations";
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
			'Direct push to production is blocked. Use "bun run db -- migrate production" after generate and committing apps/server/drizzle/.',
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

	if (
		action !== "push" &&
		action !== "purge" &&
		action !== "grant-plan" &&
		action !== "migrate" &&
		action !== "generate" &&
		action !== "migration-check" &&
		action !== "confirm-migration-commit" &&
		action !== "verify-migrations"
	) {
		die(`Unknown action: ${action}`);
	}

	if (action === "migration-check") {
		const extra = argv.slice(1);
		if (extra.some((arg) => arg !== "--skip-generate")) {
			die(
				'migration-check accepts only --skip-generate - use "bun run db -- migration-check"',
			);
		}
		const cmd = packageRunCmd(rootDir, server, "db:migration:check");
		if (extra.length > 0) {
			cmd.push("--", ...extra);
		}
		await runInheritExit(rootDir, cmd);
		return;
	}

	if (action === "confirm-migration-commit") {
		const extra = argv.slice(1);
		if (extra.length !== 1 || extra[0] !== "--staged") {
			die(
				'confirm-migration-commit accepts only --staged - use "bun run db -- confirm-migration-commit --staged"',
			);
		}
		const cmd = packageRunCmd(rootDir, server, "db:confirm-migration-commit");
		cmd.push("--", "--staged");
		await runInheritExit(rootDir, cmd);
		return;
	}

	if (action === "verify-migrations") {
		if (argv[1] !== undefined) {
			die(
				'verify-migrations takes no profile - use "bun run db -- verify-migrations"',
			);
		}
		await runInheritExit(
			rootDir,
			packageRunCmd(rootDir, server, "db:verify-migrations"),
		);
		return;
	}

	if (action === "generate") {
		if (argv[1] !== undefined) {
			die('generate takes no profile - use "bun run db -- generate"');
		}
		await runInheritExit(
			rootDir,
			packageRunCmd(rootDir, server, "db:generate"),
		);
		return;
	}

	const profile = assertProfile(argv[1] ?? "");

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
			process.exit(await migrateProd(rootDir));
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
