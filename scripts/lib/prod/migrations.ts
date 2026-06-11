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

export async function listAppliedMigrations(
	ctx: ProdContext,
): Promise<AppliedMigrationRow[]> {
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
		if (msg.includes("does not exist")) return [];
		throw new Error(msg || "Failed to read drizzle.__drizzle_migrations");
	}

	return r.stdout
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

export function pendingJournalTags(
	journal: MigrationJournalEntry[],
	applied: AppliedMigrationRow[],
): string[] {
	const pendingCount = Math.max(0, journal.length - applied.length);
	return journal.slice(-pendingCount).map((entry) => entry.tag);
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
