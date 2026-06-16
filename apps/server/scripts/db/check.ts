#!/usr/bin/env bun
import { runMigrationCheck } from "@/lib/platform/db/migrations/check";
import { loadToolingEnv } from "@/lib/platform/db/migrations/tooling-env";

loadToolingEnv();

const skipGenerate = process.argv.includes("--skip-generate");

try {
	const { migrationCount } = runMigrationCheck({
		generateDryRun: !skipGenerate,
	});
	console.log(`[db-migration-check] ok (${migrationCount} migration(s))`);
} catch (error) {
	console.error(
		`[db-migration-check] ${error instanceof Error ? error.message : String(error)}`,
	);
	process.exit(1);
}
