import { Client } from "pg";
import env from "@/env";
import { flushDevCache, initCache } from "@/lib/platform/cache/session";

const ALLOWED_LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

const fail = (message: string, error?: unknown): never => {
	console.error(message, error ?? "");
	process.exit(1);
	throw new Error(message);
};

if (env.DEPLOYMENT === "production") {
	fail(
		`✗ Safeguard Error: Database clear script is not allowed when DEPLOYMENT is "production".`,
	);
}

const connectionString = env.PG_URI.replace(":dbname", env.DB_NAME);
let hostname = "";
try {
	hostname = new URL(connectionString).hostname.toLowerCase();
} catch (err) {
	fail("✗ Safeguard Error: PG_URI does not parse as a valid URL:", err);
}

if (env.DEPLOYMENT === "local" && !ALLOWED_LOCAL_HOSTS.has(hostname)) {
	fail(
		`✗ Safeguard Error: Local database clear is only allowed against localhost. Target hostname "${hostname}" is not allowed.`,
	);
}

console.log(
	`Connecting (${env.DEPLOYMENT}): ${connectionString.replace(/:\/\/.*@/, "://***@")}`,
);

const client = new Client({ connectionString });

try {
	await client.connect();
	console.log("Connected to database");

	await client.query("BEGIN");
	console.log("Dropping drizzle migration journal...");
	await client.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
	console.log("Dropping public schema...");
	await client.query("DROP SCHEMA IF EXISTS public CASCADE");
	console.log("Creating public schema...");
	await client.query("CREATE SCHEMA public");
	console.log("Granting permissions...");
	await client.query("GRANT ALL ON SCHEMA public TO CURRENT_USER");
	await client.query("GRANT ALL ON SCHEMA public TO PUBLIC");
	await client.query("COMMIT");
	console.log("✓ Database cleared successfully");

	try {
		await initCache();
		await flushDevCache();
		console.log("✓ Dragonfly cache flushed");
	} catch (cacheErr) {
		console.warn(
			"⚠ Dragonfly cache flush skipped (is docker compose up?):",
			cacheErr instanceof Error ? cacheErr.message : cacheErr,
		);
	}
} catch (err) {
	console.error("✗ Failed to clear database:", err);
	try {
		await client.query("ROLLBACK");
	} catch {
		// ignore rollback failure
	}
	process.exit(1);
} finally {
	await client.end();
}
