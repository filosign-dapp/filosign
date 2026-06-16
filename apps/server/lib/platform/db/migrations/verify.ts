import pg from "pg";
import { applyMigrations } from "./apply";
import { readJournal } from "./journal";

const DEFAULT_VERIFY_URL =
	"postgresql://filosign:filosign@localhost:5432/filosign_migration_verify";

const SMOKE_COLUMNS: readonly { table: string; column: string }[] = [
	{ table: "file_register_states", column: "piece_cid" },
	{ table: "file_register_states", column: "assigned_relayer_address" },
	{ table: "files", column: "registration_status" },
	{ table: "files", column: "assigned_relayer_address" },
	{ table: "organizations", column: "assigned_relayer_address" },
	{ table: "job_outbox", column: "id" },
] as const;

function resolveVerifyUrl(): string {
	return process.env.DRIZZLE_VERIFY_DATABASE_URL?.trim() ?? DEFAULT_VERIFY_URL;
}

function adminUrl(databaseUrl: string): string {
	const slash = databaseUrl.lastIndexOf("/");
	if (slash === -1) {
		throw new Error("DRIZZLE_VERIFY_DATABASE_URL must include a database name");
	}
	return `${databaseUrl.slice(0, slash + 1)}postgres`;
}

function databaseName(databaseUrl: string): string {
	const slash = databaseUrl.lastIndexOf("/");
	return databaseUrl.slice(slash + 1);
}

async function ensureDatabase(verifyUrl: string): Promise<void> {
	const dbName = databaseName(verifyUrl);
	const admin = new pg.Client({ connectionString: adminUrl(verifyUrl) });
	await admin.connect();
	try {
		const exists = await admin.query<{ exists: boolean }>(
			"SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
			[dbName],
		);
		if (!exists.rows[0]?.exists) {
			await admin.query(`CREATE DATABASE "${dbName.replaceAll('"', '""')}"`);
		}
	} finally {
		await admin.end();
	}
}

async function resetSchemas(verifyUrl: string): Promise<void> {
	const client = new pg.Client({ connectionString: verifyUrl });
	await client.connect();
	try {
		await client.query("DROP SCHEMA IF EXISTS public CASCADE");
		await client.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
		await client.query("CREATE SCHEMA public");
		await client.query("GRANT ALL ON SCHEMA public TO public");
	} finally {
		await client.end();
	}
}

async function assertSmoke(
	verifyUrl: string,
	expectedMigrations: number,
): Promise<void> {
	const client = new pg.Client({ connectionString: verifyUrl });
	await client.connect();
	try {
		for (const { table, column } of SMOKE_COLUMNS) {
			const tableResult = await client.query<{ regclass: string | null }>(
				"SELECT to_regclass($1) AS regclass",
				[`public.${table}`],
			);
			if (!tableResult.rows[0]?.regclass) {
				throw new Error(`table public.${table} missing after migrate`);
			}

			const columnResult = await client.query<{ exists: boolean }>(
				`SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
        ) AS exists`,
				[table, column],
			);
			if (!columnResult.rows[0]?.exists) {
				throw new Error(
					`column public.${table}.${column} missing after migrate`,
				);
			}
		}

		const journal = await client.query<{ count: string }>(
			"SELECT count(*)::text AS count FROM drizzle.__drizzle_migrations",
		);
		const count = Number(journal.rows[0]?.count ?? "0");
		if (count < expectedMigrations) {
			throw new Error(
				`expected ${expectedMigrations} drizzle journal rows, found ${count}`,
			);
		}
	} finally {
		await client.end();
	}
}

export async function runMigrationVerify(): Promise<void> {
	const verifyUrl = resolveVerifyUrl();
	const expectedMigrations = readJournal().length;

	try {
		await ensureDatabase(verifyUrl);
		await resetSchemas(verifyUrl);
		await applyMigrations(verifyUrl);
		await assertSmoke(verifyUrl, expectedMigrations);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (
			message.includes("ECONNREFUSED") ||
			message.includes("does not exist")
		) {
			throw new Error(
				`${message} - start Postgres (e.g. docker compose -f deploy/compose.dev-full.yml up -d postgres) or set DRIZZLE_VERIFY_DATABASE_URL`,
			);
		}
		throw error;
	}
}
