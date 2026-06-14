#!/usr/bin/env bun
/**
 * Child process: Infisical prod env + SSH tunnel URL for drizzle-kit migrate.
 * Invoked by migrateProd only (Infisical runs on the laptop, not the VPS).
 */
import { createRequire } from "node:module";
import path from "node:path";

const localPort = process.env.PROD_PG_LOCAL_PORT?.trim();
const serverDir = process.env.PROD_SERVER_DIR?.trim();
const pgUri = process.env.PG_URI?.trim();
const dbName =
	process.env.PROD_TARGET_DB?.trim() || process.env.DB_NAME?.trim() || "";
const expectedCountRaw = process.env.PROD_MIGRATE_EXPECTED_COUNT?.trim();
const sshProbeCountRaw = process.env.PROD_SSH_PROBE_COUNT?.trim();

if (!localPort || !serverDir || !pgUri || !dbName) {
	console.error(
		"PROD_PG_LOCAL_PORT, PROD_SERVER_DIR, PG_URI, and PROD_TARGET_DB (or DB_NAME) are required",
	);
	process.exit(1);
}

/** Resolve :dbname, then point host at the local SSH tunnel (password-safe; no URL parser). */
function tunnelDatabaseUrl(
	pgUri: string,
	dbName: string,
	localPort: number,
): string {
	const resolved = pgUri.replaceAll(":dbname", dbName);
	const at = resolved.lastIndexOf("@");
	if (at === -1) {
		throw new Error("PG_URI must include credentials and host");
	}
	const suffix = resolved.slice(at + 1);
	const slash = suffix.indexOf("/");
	const dbPath = slash === -1 ? `/${dbName}` : suffix.slice(slash);
	return `${resolved.slice(0, at + 1)}127.0.0.1:${localPort}${dbPath}`;
}

function redactDatabaseUrl(url: string): string {
	return url.replace(/:\/\/([^@/]+)@/, "://***@");
}

const databaseUrl = tunnelDatabaseUrl(pgUri, dbName, Number(localPort));
console.error(
	`[drizzle-migrate] target ${redactDatabaseUrl(databaseUrl)}`,
);

const require = createRequire(path.join(path.resolve(serverDir), "package.json"));
const { Client } = require("pg") as typeof import("pg");

function isMigrationJournalMissing(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return message.includes("does not exist");
}

async function countMigrations(connectionString: string): Promise<number> {
	const client = new Client({ connectionString });
	await client.connect();
	try {
		const result = await client.query<{ count: string }>(
			"SELECT count(*)::text AS count FROM drizzle.__drizzle_migrations;",
		);
		return Number(result.rows[0]?.count ?? "0");
	} catch (error) {
		if (isMigrationJournalMissing(error)) {
			return 0;
		}
		throw error;
	} finally {
		await client.end();
	}
}

const beforeCount = await countMigrations(databaseUrl).catch((error: unknown) => {
	console.error(
		`[drizzle-migrate] could not read drizzle.__drizzle_migrations before migrate: ${
			error instanceof Error ? error.message : String(error)
		}`,
	);
	process.exit(1);
});

if (sshProbeCountRaw) {
	const sshProbeCount = Number(sshProbeCountRaw);
	if (Number.isFinite(sshProbeCount) && sshProbeCount !== beforeCount) {
		console.error(
			`[drizzle-migrate] VPS probe reports ${sshProbeCount} journal row(s) on "${dbName}" but tunnel sees ${beforeCount}. ` +
				`drizzle-kit is not connected to the same database (tunnel down or local port ${localPort} in use).`,
		);
		process.exit(1);
	}
}

const proc = Bun.spawnSync({
	cmd: [
		"bunx",
		"--bun",
		"drizzle-kit",
		"migrate",
		"--config=drizzle.migrate.config.ts",
	],
	cwd: path.resolve(serverDir),
	stdout: "inherit",
	stderr: "inherit",
	env: {
		...process.env,
		DRIZZLE_DATABASE_URL: databaseUrl,
	},
});

if (proc.exitCode !== 0) {
	process.exit(proc.exitCode ?? 1);
}

const afterCount = await countMigrations(databaseUrl).catch((error: unknown) => {
	console.error(
		`[drizzle-migrate] could not read drizzle.__drizzle_migrations after migrate: ${
			error instanceof Error ? error.message : String(error)
		}`,
	);
	process.exit(1);
});

const expectedCount = expectedCountRaw ? Number(expectedCountRaw) : null;
if (expectedCount != null && Number.isFinite(expectedCount)) {
	if (afterCount !== expectedCount) {
		console.error(
			`[drizzle-migrate] expected ${expectedCount} journal row(s) on "${dbName}", found ${afterCount} (before ${beforeCount})`,
		);
		process.exit(1);
	}
} else if (afterCount < beforeCount) {
	console.error(
		`[drizzle-migrate] migration count decreased (${beforeCount} → ${afterCount})`,
	);
	process.exit(1);
}

console.error(
	`[drizzle-migrate] journal rows on "${dbName}": ${beforeCount} → ${afterCount}`,
);

process.exit(0);
