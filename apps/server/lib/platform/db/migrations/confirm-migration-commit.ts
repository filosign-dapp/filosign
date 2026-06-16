import path from "node:path";
import { serverRoot } from "./paths";

export const DRIZZLE_STAGED_PREFIX = "apps/server/drizzle/";

/** Staged paths to block: added, copied, modified, renamed, deleted (not ACM-only; R/D bypassed that). */
export const STAGED_DIFF_FILTER = "ACMRD";

const BLOCK_BANNER = [
	"",
	"!!! MIGRATION COMMIT BLOCKED !!!",
	"",
	"Staged Drizzle files cannot be committed through the default hook.",
	"Review the SQL below. When safe to ship:",
	"",
	'  git commit --no-verify -m "db: <description>"',
	"",
	"Agents: do not use --no-verify. Leave migration files unstaged for the user.",
	"",
].join("\n");

export type GitRunner = {
	diffCachedNames: (args: string[]) => string;
	showIndex: (filePath: string) => string;
};

const repoRoot = path.resolve(serverRoot, "../..");

function runGit(args: string[]): { stdout: string; exitCode: number } {
	const proc = Bun.spawnSync(["git", ...args], {
		cwd: repoRoot,
		stdout: "pipe",
		stderr: "pipe",
	});
	const stdout = proc.stdout.toString();
	if (proc.exitCode !== 0) {
		const stderr = proc.stderr.toString().trim();
		throw new Error(
			stderr
				? `git ${args.join(" ")} failed: ${stderr}`
				: `git ${args.join(" ")} exited ${proc.exitCode}`,
		);
	}
	return { stdout, exitCode: proc.exitCode };
}

export const defaultGitRunner: GitRunner = {
	diffCachedNames(args) {
		return runGit(args).stdout;
	},
	showIndex(filePath) {
		return runGit(["show", `:${filePath}`]).stdout;
	},
};

export function listStagedDrizzlePaths(
	git: GitRunner = defaultGitRunner,
): string[] {
	const output = git.diffCachedNames([
		"diff",
		"--cached",
		"--name-only",
		"--diff-filter",
		STAGED_DIFF_FILTER,
		"--",
		`${DRIZZLE_STAGED_PREFIX}`,
	]);
	return output
		.split("\n")
		.map((line) => line.trim())
		.filter(
			(line) => line.length > 0 && line.startsWith(DRIZZLE_STAGED_PREFIX),
		);
}

export function formatStagedDrizzlePreview(
	paths: string[],
	git: GitRunner = defaultGitRunner,
): string {
	const sections: string[] = [BLOCK_BANNER, "Staged files:"];
	for (const filePath of paths) {
		sections.push(`  - ${filePath}`);
	}
	sections.push("");

	for (const filePath of paths) {
		const content = git.showIndex(filePath);
		sections.push(`--- ${filePath} ---`);
		sections.push(content.trimEnd());
		sections.push("");
	}

	return sections.join("\n");
}

/** Blocks commit when staged Drizzle paths exist. Returns process exit code. */
export function runConfirmMigrationCommit(
	git: GitRunner = defaultGitRunner,
): number {
	const paths = listStagedDrizzlePaths(git);
	if (paths.length === 0) {
		return 0;
	}

	console.error(formatStagedDrizzlePreview(paths, git));
	return 1;
}
