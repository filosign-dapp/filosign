import { Client } from "pg";
import { flushDevCache, initCache } from "@/lib/platform/cache/session-cache";

// Bun automatically loads --env-file into process.env
const PG_URI = process.env.PG_URI;
const DB_NAME = process.env.DB_NAME;

if (!PG_URI || !DB_NAME) {
	console.error("Missing required env vars: PG_URI and DB_NAME");
	console.error(
		"Make sure to run with: bun run --env-file=.env.xxx scripts/clear-db.ts",
	);
	process.exit(1);
}

const connectionString = PG_URI.replace(":dbname", DB_NAME);
console.log(
	`Connecting to: ${connectionString.replace(/:\/\/.*@/, "://***@")}`,
);

const client = new Client({ connectionString });

try {
	await client.connect();
	console.log("Connected to database");

	await client.query("BEGIN");
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
