import { dockerExec, dockerState } from "./ssh.ts";
import type { Action, ProbeResult, ProdContext } from "./types.ts";

export async function probe(
	ctx: ProdContext,
	action: Action,
): Promise<ProbeResult> {
	if (action === "health") return health(ctx);
	return info(ctx);
}

async function health(ctx: ProdContext): Promise<ProbeResult> {
	const state = await dockerState(ctx, ctx.containers.postgres);
	if (!state.running) {
		return {
			id: "backups",
			action: "health",
			ok: false,
			summary: `postgres container ${state.status}`,
		};
	}

	const r = await dockerExec(
		ctx,
		ctx.containers.postgres,
		["pgbackrest", `--stanza=${ctx.stanza}`, "check"],
		{ user: "postgres" },
	);
	if (r.code !== 0) {
		return {
			id: "backups",
			action: "health",
			ok: false,
			summary: "pgbackrest check failed",
			detail: [r.stdout, r.stderr].filter(Boolean).join("\n").trim() || undefined,
		};
	}

	return {
		id: "backups",
		action: "health",
		ok: true,
		summary: "pgbackrest check OK",
	};
}

async function info(ctx: ProdContext): Promise<ProbeResult> {
	const state = await dockerState(ctx, ctx.containers.postgres);
	if (!state.running) {
		return {
			id: "backups",
			action: "info",
			ok: false,
			summary: `postgres container ${state.status}`,
		};
	}

	const r = await dockerExec(
		ctx,
		ctx.containers.postgres,
		["pgbackrest", `--stanza=${ctx.stanza}`, "info"],
		{ user: "postgres" },
	);

	return {
		id: "backups",
		action: "info",
		ok: r.code === 0,
		summary: r.code === 0 ? "pgbackrest info" : "pgbackrest info failed",
		detail: [r.stdout, r.stderr].filter(Boolean).join("\n").trim() || undefined,
	};
}
