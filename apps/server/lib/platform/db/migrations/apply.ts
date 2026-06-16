import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { migrationsFolder } from "./paths";

export async function applyMigrations(
	connectionString: string,
	folder: string = migrationsFolder,
): Promise<void> {
	const pool = new pg.Pool({ connectionString, max: 1 });
	try {
		const db = drizzle(pool);
		await migrate(db, { migrationsFolder: folder });
	} finally {
		await pool.end();
	}
}
