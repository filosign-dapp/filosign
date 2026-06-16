#!/usr/bin/env bun
import { runConfirmMigrationCommit } from "@/lib/platform/db/migrations/confirm-migration-commit";

const args = process.argv.slice(2);

if (args.length !== 1 || args[0] !== "--staged") {
	console.error(
		"Usage: bun run scripts/db/confirm-migration-commit.ts --staged",
	);
	process.exit(1);
}

process.exit(runConfirmMigrationCommit());
