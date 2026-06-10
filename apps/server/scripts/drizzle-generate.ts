#!/usr/bin/env bun
/**
 * Generate migration SQL from schema changes. Commit apps/server/drizzle/ before migrate on staging/prod.
 */
import { loadDrizzleToolingEnv } from "./load-drizzle-tooling-env";

loadDrizzleToolingEnv();

const proc = Bun.spawn({
	cmd: ["bunx", "--bun", "drizzle-kit", "generate"],
	cwd: `${import.meta.dir}/..`,
	stdout: "inherit",
	stderr: "inherit",
	stdin: "inherit",
});

process.exit((await proc.exited) ?? 1);
