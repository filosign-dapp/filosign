import { readFileSync } from "node:fs";
import path from "node:path";
import { dockerExec } from "./ssh.ts";
import type { ProdContext } from "./types.ts";

export type MigrationJournalEntry = {
	idx: number;
	tag: string;
	when: number;
};

export type AppliedMigrationRow = {
	id: number;
	hash: string;
	createdAtMs: number;
};

export type AppliedMigrationsProbe = {
	rows: AppliedMigrationRow[];
	/** Drizzle journal table/schema not present on this database. */
	journalMissing: boolean;
};

export function readMigrationJournal(root: string): MigrationJournalEntry[] {
	const journalPath = path.join(root, "apps/server/drizzle/meta/_journal.json");
	const raw = JSON.parse(readFileSync(journalPath, "utf8")) as {
		entries: Array<{ idx: number; tag: string; when: number }>;
	};
	return raw.entries.map((entry) => ({
		idx: entry.idx,
		tag: entry.tag,
		when: entry.when,
	}));
}

function parseAppliedMigrationStdout(stdout: string): AppliedMigrationRow[] {
	return stdout
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const [idRaw, hash, createdRaw] = line.split("\t");
			return {
				id: Number(idRaw),
				hash: hash ?? "",
				createdAtMs: Number(createdRaw),
			};
		})
		.filter((row) => Number.isFinite(row.id));
}

export async function listAppliedMigrations(
	ctx: ProdContext,
): Promise<AppliedMigrationsProbe> {
	const r = await dockerExec(ctx, ctx.containers.postgres, [
		"psql",
		"-U",
		ctx.pgUser,
		"-d",
		ctx.pgDb,
		"-t",
		"-A",
		"-F",
		"\t",
		"-c",
		"SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id;",
	]);

	if (r.code !== 0) {
		const msg = [r.stderr, r.stdout].filter(Boolean).join("\n").trim();
		const databaseMissing =
			/database\s+"[^"]+"\s+does not exist/i.test(msg) ||
			/FATAL:\s+database\s+"[^"]+"\s+does not exist/i.test(msg);
		if (databaseMissing) {
			throw new Error(
				`Postgres database "${ctx.pgDb}" does not exist on ${ctx.containers.postgres}. ` +
					`Set PROD_PG_DB in deploy/.env to match Infisical DB_NAME.`,
			);
		}
		if (msg.includes("does not exist")) {
			return { rows: [], journalMissing: true };
		}
		throw new Error(msg || "Failed to read drizzle.__drizzle_migrations");
	}

	return {
		rows: parseAppliedMigrationStdout(r.stdout),
		journalMissing: false,
	};
}

export function pendingJournalTags(
	journal: MigrationJournalEntry[],
	applied: AppliedMigrationRow[],
): string[] {
	const pendingCount = journal.length - applied.length;
	if (pendingCount <= 0) return [];
	// slice(applied.length), not slice(-pendingCount): slice(-0) === slice(0) → full array
	return journal.slice(applied.length).map((entry) => entry.tag);
}

export function newlyAppliedMigrations(
	before: AppliedMigrationRow[],
	after: AppliedMigrationRow[],
): AppliedMigrationRow[] {
	const beforeIds = new Set(before.map((row) => row.id));
	return after.filter((row) => !beforeIds.has(row.id));
}

export function formatAppliedMigration(row: AppliedMigrationRow): string {
	const when = Number.isFinite(row.createdAtMs)
		? new Date(row.createdAtMs).toISOString()
		: "unknown time";
	return `#${row.id} ${row.hash.slice(0, 12)}… @ ${when}`;
}

export function inferTagsForNewMigrations(
	journal: MigrationJournalEntry[],
	before: AppliedMigrationRow[],
	after: AppliedMigrationRow[],
): string[] {
	const newRows = newlyAppliedMigrations(before, after);
	if (newRows.length === 0) return [];
	const start = before.length;
	return journal.slice(start, start + newRows.length).map((entry) => entry.tag);
}

/** Infisical DB_NAME used by drizzle-kit migrate (child process). */
export function resolveInfisicalDbName(root: string): string | null {
	const proc = Bun.spawnSync({
		cmd: [
			"infisical",
			"run",
			"--env=prod",
			"--path=/app",
			"--",
			"printenv",
			"DB_NAME",
		],
		cwd: root,
		stdout: "pipe",
		stderr: "pipe",
	});
	if (proc.exitCode !== 0) return null;
	const value = new TextDecoder().decode(proc.stdout).trim();
	return value || null;
}
