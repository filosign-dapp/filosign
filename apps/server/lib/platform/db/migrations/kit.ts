import { listSqlTags } from "./journal";
import { serverRoot } from "./paths";

type KitCommand = "check" | "generate";

export function runKit(command: KitCommand): {
	exitCode: number;
	output: string;
} {
	const proc = Bun.spawnSync(["bunx", "--bun", "drizzle-kit", command], {
		cwd: serverRoot,
		stdout: "pipe",
		stderr: "pipe",
		env: command === "generate" ? { ...process.env, CI: "true" } : process.env,
	});
	const output = `${proc.stdout}\n${proc.stderr}`;
	return { exitCode: proc.exitCode ?? 1, output };
}

export function assertGenerateUnchanged(before: Set<string>): void {
	const after = new Set(listSqlTags());
	const created = [...after].filter((tag) => !before.has(tag));
	if (created.length > 0) {
		throw new Error(
			`generate dry-run created new SQL when schema unchanged: ${created.join(", ")}`,
		);
	}
}
