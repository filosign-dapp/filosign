import type { ProdContext } from "./types.ts";

export type SshResult = {
	stdout: string;
	stderr: string;
	code: number;
};

export async function sshCapture(
	ctx: ProdContext,
	remote: string,
): Promise<SshResult> {
	const proc = Bun.spawnSync({
		cmd: ["ssh", ctx.ssh, remote],
		stdout: "pipe",
		stderr: "pipe",
	});
	return {
		stdout: new TextDecoder().decode(proc.stdout).trimEnd(),
		stderr: new TextDecoder().decode(proc.stderr).trimEnd(),
		code: proc.exitCode ?? 1,
	};
}

export async function dockerExec(
	ctx: ProdContext,
	container: string,
	args: string[],
	opts?: { user?: string },
): Promise<SshResult> {
	const parts = ["docker", "exec"];
	if (opts?.user) parts.push("-u", opts.user);
	parts.push(container, ...args);
	return sshCapture(ctx, parts.join(" "));
}

export type DockerState = {
	running: boolean;
	status: string;
	health: string | null;
};

export async function dockerState(
	ctx: ProdContext,
	container: string,
): Promise<DockerState> {
	const r = await sshCapture(
		ctx,
		`docker inspect --format '{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{end}}' ${container}`,
	);
	if (r.code !== 0) {
		return { running: false, status: "missing", health: null };
	}
	const [status, health = ""] = r.stdout.split("|");
	return {
		running: status === "running",
		status,
		health: health || null,
	};
}

export function containerHealthOk(state: DockerState): boolean {
	if (!state.running) return false;
	if (!state.health) return true;
	return state.health === "healthy";
}
