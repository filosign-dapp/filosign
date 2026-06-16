import {
	assertJournalSqlParity,
	assertSnapshotChain,
	listSqlTags,
	readJournal,
} from "./journal";
import { assertGenerateUnchanged, runKit } from "./kit";

export type MigrationCheckOptions = {
	/** When false, skip `drizzle-kit generate` dry-run (faster local runs). */
	generateDryRun?: boolean;
};

export function runMigrationCheck(options: MigrationCheckOptions = {}): {
	migrationCount: number;
} {
	const generateDryRun = options.generateDryRun ?? true;
	const journal = readJournal();

	assertJournalSqlParity(journal);
	assertSnapshotChain(journal);

	const kitCheck = runKit("check");
	if (kitCheck.exitCode !== 0) {
		console.error(kitCheck.output);
		throw new Error("drizzle-kit check failed");
	}

	if (generateDryRun) {
		const before = new Set(listSqlTags());
		const kitGenerate = runKit("generate");
		if (
			kitGenerate.exitCode !== 0 &&
			!kitGenerate.output.includes("No schema changes")
		) {
			console.error(kitGenerate.output);
			throw new Error(
				`drizzle-kit generate dry-run exited ${kitGenerate.exitCode}`,
			);
		}
		assertGenerateUnchanged(before);
	}

	return { migrationCount: journal.length };
}
