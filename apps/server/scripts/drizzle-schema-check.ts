#!/usr/bin/env bun
/**
 * CI/local: ensure committed migrations match Drizzle schema (drizzle-kit check).
 * Uses tooling env stub when .env.local is absent.
 */
import { loadDrizzleToolingEnv } from "./load-drizzle-tooling-env";

loadDrizzleToolingEnv();

const proc = Bun.spawnSync(["bunx", "--bun", "drizzle-kit", "check"], {
	cwd: `${import.meta.dir}/..`,
	stdout: "inherit",
	stderr: "inherit",
});

process.exit(proc.exitCode ?? 1);
