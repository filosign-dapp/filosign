import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { drizzleDir, metaDir } from "./paths";

export type JournalEntry = {
	idx: number;
	tag: string;
};

type SnapshotMeta = {
	id: string;
	prevId: string;
};

const FIRST_PREV_ID = "00000000-0000-0000-0000-000000000000";

export function readJournal(): JournalEntry[] {
	const raw = JSON.parse(
		readFileSync(path.join(metaDir, "_journal.json"), "utf8"),
	) as { entries: JournalEntry[] };
	return raw.entries;
}

export function listSqlTags(): string[] {
	return readdirSync(drizzleDir)
		.filter((name) => name.endsWith(".sql"))
		.map((name) => name.replace(/\.sql$/, ""))
		.sort();
}

export function snapshotPath(entry: JournalEntry): string {
	return path.join(
		metaDir,
		`${String(entry.idx).padStart(4, "0")}_snapshot.json`,
	);
}

function readSnapshotMeta(entry: JournalEntry): SnapshotMeta {
	const filePath = snapshotPath(entry);
	let rawText: string;
	try {
		rawText = readFileSync(filePath, "utf8");
	} catch {
		throw new Error(
			`missing snapshot meta/${path.basename(filePath)} for ${entry.tag}`,
		);
	}
	const raw = JSON.parse(rawText) as SnapshotMeta;
	if (!raw.id || !raw.prevId) {
		throw new Error(
			`snapshot meta/${path.basename(filePath)} missing id or prevId`,
		);
	}
	return raw;
}

export function assertJournalSqlParity(journal: JournalEntry[]): void {
	const sqlTags = listSqlTags();
	const journalTags = journal.map((entry) => entry.tag);
	const journalSet = new Set(journalTags);
	const sqlSet = new Set(sqlTags);

	for (const tag of journalTags) {
		if (!sqlSet.has(tag)) {
			throw new Error(`journal entry "${tag}" has no matching ${tag}.sql`);
		}
	}

	for (const tag of sqlTags) {
		if (!journalSet.has(tag)) {
			throw new Error(
				`orphan SQL file ${tag}.sql is not listed in meta/_journal.json`,
			);
		}
	}

	for (let i = 0; i < journal.length; i++) {
		if (journal[i]?.idx !== i) {
			throw new Error(`journal idx mismatch at position ${i}`);
		}
	}
}

export function assertSnapshotChain(journal: JournalEntry[]): void {
	if (journal.length === 0) {
		return;
	}

	for (const entry of journal) {
		readFileSync(snapshotPath(entry));
	}

	const first = readSnapshotMeta(journal[0]!);
	if (first.prevId !== FIRST_PREV_ID) {
		throw new Error(
			`snapshot ${journal[0]!.tag}: first migration prevId must be all-zero uuid`,
		);
	}

	let previousId = first.id;
	for (let i = 1; i < journal.length; i++) {
		const entry = journal[i]!;
		const snapshot = readSnapshotMeta(entry);
		if (snapshot.prevId !== previousId) {
			throw new Error(
				`snapshot chain broken at ${entry.tag}: prevId ${snapshot.prevId} != previous id ${previousId}`,
			);
		}
		previousId = snapshot.id;
	}
}
