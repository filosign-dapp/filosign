#!/usr/bin/env bun
/**
 * Child process: Infisical prod env + PG_URI rewritten to SSH tunnel local port.
 * Invoked by migrateProd only.
 */
import path from "node:path";

const localPort = process.env.PROD_PG_LOCAL_PORT?.trim();
const serverDir = process.env.PROD_SERVER_DIR?.trim();
const pgUri = process.env.PG_URI?.trim();

if (!localPort || !serverDir || !pgUri) {
	console.error("PROD_PG_LOCAL_PORT, PROD_SERVER_DIR, and PG_URI are required");
	process.exit(1);
}

const u = new URL(pgUri.replace(":dbname", "/dbname"));
u.hostname = "127.0.0.1";
u.port = localPort;
process.env.PG_URI = u.toString().replace("/dbname", ":dbname");

const proc = Bun.spawnSync({
	cmd: ["bunx", "--bun", "drizzle-kit", "migrate"],
	cwd: path.resolve(serverDir),
	stdout: "inherit",
	stderr: "inherit",
	env: process.env,
});

process.exit(proc.exitCode ?? 1);
