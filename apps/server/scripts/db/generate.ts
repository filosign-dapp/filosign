#!/usr/bin/env bun
import { readdirSync } from "node:fs";
import { drizzleDir, serverRoot } from "@/lib/platform/db/migrations/paths";
import { loadToolingEnv } from "@/lib/platform/db/migrations/tooling-env";

loadToolingEnv();

const before = new Set(
	readdirSync(drizzleDir)
		.filter((name) => name.endsWith(".sql"))
		.map((name) => name),
);

const proc = Bun.spawn({
	cmd: ["bunx", "--bun", "drizzle-kit", "generate"],
	cwd: serverRoot,
	stdout: "inherit",
	stderr: "inherit",
	stdin: "inherit",
});

const exitCode = (await proc.exited) ?? 1;
if (exitCode !== 0) {
	process.exit(exitCode);
}

const after = readdirSync(drizzleDir).filter((name) => name.endsWith(".sql"));
if (after.some((name) => !before.has(name))) {
	console.log(
		"\nCommit all files under apps/server/drizzle/ (SQL + meta/) before migrate on sandbox/production.\n",
	);
}
