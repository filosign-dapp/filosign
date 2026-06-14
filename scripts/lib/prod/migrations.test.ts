import { describe, expect, test } from "bun:test";
import {
	type MigrationJournalEntry,
	pendingJournalTags,
} from "./migrations.ts";

const journal: MigrationJournalEntry[] = [
	{ idx: 0, tag: "0000_initial", when: 1 },
	{ idx: 1, tag: "0001_activation", when: 2 },
	{ idx: 2, tag: "0002_noisy_havok", when: 3 },
];

describe("pendingJournalTags", () => {
	test("returns empty when all journal entries are applied", () => {
		expect(
			pendingJournalTags(journal, [
				{ id: 1, hash: "a", createdAtMs: 1 },
				{ id: 2, hash: "b", createdAtMs: 2 },
				{ id: 3, hash: "c", createdAtMs: 3 },
			]),
		).toEqual([]);
	});

	test("returns suffix tags when partially applied", () => {
		expect(
			pendingJournalTags(journal, [{ id: 1, hash: "a", createdAtMs: 1 }]),
		).toEqual(["0001_activation", "0002_noisy_havok"]);
	});

	test("returns full journal when none applied", () => {
		expect(pendingJournalTags(journal, [])).toEqual([
			"0000_initial",
			"0001_activation",
			"0002_noisy_havok",
		]);
	});
});
