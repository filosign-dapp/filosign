/** Spawn child processes with inherited stdio from orchestrators. */

export type SpawnTask = {
	label: string;
	cmd: string[];
};

export async function runInherit(
	rootDir: string,
	cmd: string[],
	envOverrides?: Record<string, string>,
): Promise<number> {
	const proc = Bun.spawn({
		cmd,
		cwd: rootDir,
		stdout: "inherit",
		stderr: "inherit",
		stdin: "inherit",
		env: envOverrides ? { ...process.env, ...envOverrides } : process.env,
	});
	return (await proc.exited) ?? 1;
}

export async function runInheritExit(
	rootDir: string,
	cmd: string[],
): Promise<never> {
	process.exit(await runInherit(rootDir, cmd));
}

/** Run commands in order; stops on first non-zero exit. */
export async function runSequentialExit(
	rootDir: string,
	cmds: string[][],
): Promise<never> {
	for (const cmd of cmds) {
		const code = await runInherit(rootDir, cmd);
		if (code !== 0) process.exit(code);
	}
	process.exit(0);
}

export async function runParallelExit(
	rootDir: string,
	tasks: SpawnTask[],
): Promise<never> {
	console.log(`Starting: ${tasks.map((t) => t.label).join(", ")}\n`);

	const children = tasks.map((task) =>
		Bun.spawn({
			cmd: task.cmd,
			cwd: rootDir,
			stdout: "inherit",
			stderr: "inherit",
			stdin: "inherit",
			env: process.env,
		}),
	);

	const killAll = () => {
		for (const child of children) {
			if (!child.killed) child.kill();
		}
	};

	process.on("SIGINT", () => {
		killAll();
		process.exit(130);
	});
	process.on("SIGTERM", killAll);

	const codes = await Promise.all(children.map((c) => c.exited));
	const failed = codes.find((code) => code !== 0);
	process.exit(failed ?? 0);
}
