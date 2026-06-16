#!/usr/bin/env bun
import { loadToolingEnv } from "@/lib/platform/db/migrations/tooling-env";
import { runMigrationVerify } from "@/lib/platform/db/migrations/verify";

loadToolingEnv();

try {
	await runMigrationVerify();
	console.error("[db-verify-migrations] ok");
} catch (error) {
	console.error(
		`[db-verify-migrations] ${error instanceof Error ? error.message : String(error)}`,
	);
	process.exit(1);
}
