#!/usr/bin/env bun
import { runRuntimeMigrate } from "@/lib/platform/db/migrations/runtime";

runRuntimeMigrate().catch((error: unknown) => {
	console.error(
		`[db-migrate] ${error instanceof Error ? error.message : String(error)}`,
	);
	process.exit(1);
});
