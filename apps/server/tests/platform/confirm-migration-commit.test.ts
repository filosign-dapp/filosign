import { describe, expect, test } from "bun:test";
import {
	formatStagedDrizzlePreview,
	type GitRunner,
	listStagedDrizzlePaths,
	runConfirmMigrationCommit,
	STAGED_DIFF_FILTER,
} from "@/lib/platform/db/migrations/confirm-migration-commit";

function mockGit(files: Record<string, string>): GitRunner {
	return {
		diffCachedNames() {
			return Object.keys(files).join("\n");
		},
		showIndex(filePath) {
			const content = files[filePath];
			if (content === undefined) {
				throw new Error(`missing staged content for ${filePath}`);
			}
			return content;
		},
	};
}

describe("confirm-migration-commit", () => {
	test("listStagedDrizzlePaths returns empty when nothing staged", () => {
		expect(
			listStagedDrizzlePaths(
				mockGit({
					"apps/client/src/foo.ts": "export {}",
				}),
			),
		).toEqual([]);
	});

	test("runConfirmMigrationCommit passes when no drizzle staged", () => {
		expect(
			runConfirmMigrationCommit(
				mockGit({
					"apps/server/lib/schema.ts": "export {}",
				}),
			),
		).toBe(0);
	});

	test("listStagedDrizzlePaths uses diff-filter that includes renames and deletes", () => {
		let capturedArgs: string[] = [];
		const git: GitRunner = {
			diffCachedNames(args) {
				capturedArgs = args;
				return "";
			},
			showIndex() {
				return "";
			},
		};
		listStagedDrizzlePaths(git);
		const filterIndex = capturedArgs.indexOf("--diff-filter");
		expect(filterIndex).toBeGreaterThanOrEqual(0);
		expect(capturedArgs[filterIndex + 1]).toBe(STAGED_DIFF_FILTER);
		expect(STAGED_DIFF_FILTER).toContain("R");
		expect(STAGED_DIFF_FILTER).toContain("D");
	});

	test("runConfirmMigrationCommit blocks renamed drizzle paths", () => {
		const git = mockGit({
			"apps/server/drizzle/0005_renamed.sql":
				'ALTER TABLE "files" RENAME COLUMN "a" TO "b";',
		});
		expect(runConfirmMigrationCommit(git)).toBe(1);
	});

	test("runConfirmMigrationCommit blocks and previews staged SQL", () => {
		const git = mockGit({
			"apps/server/drizzle/0005_foo.sql":
				'ALTER TABLE "files" ADD COLUMN "x" text;',
		});
		const code = runConfirmMigrationCommit(git);
		expect(code).toBe(1);

		const preview = formatStagedDrizzlePreview(
			listStagedDrizzlePaths(git),
			git,
		);
		expect(preview).toContain("MIGRATION COMMIT BLOCKED");
		expect(preview).toContain("apps/server/drizzle/0005_foo.sql");
		expect(preview).toContain('ALTER TABLE "files" ADD COLUMN "x" text;');
		expect(preview).toContain("git commit --no-verify");
	});
});
