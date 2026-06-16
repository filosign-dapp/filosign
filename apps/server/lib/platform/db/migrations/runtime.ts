import path from "node:path";
import { applyMigrations } from "./apply";

export async function runRuntimeMigrate(): Promise<void> {
	const pgUri = process.env.PG_URI?.trim();
	const dbName = process.env.DB_NAME?.trim();
	if (!pgUri || !dbName) {
		throw new Error("PG_URI and DB_NAME are required");
	}

	const folder =
		process.env.DRIZZLE_MIGRATIONS_DIR?.trim() ??
		path.join(process.cwd(), "drizzle");

	console.error(`[db-migrate] applying from ${folder} to ${dbName}`);
	await applyMigrations(pgUri.replaceAll(":dbname", dbName), folder);
	console.error("[db-migrate] complete");
}
