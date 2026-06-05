import { containerHealthOk, dockerExec, dockerState } from "./ssh.ts";
import type { Action, ProbeResult, ProdContext } from "./types.ts";

export async function probe(
	ctx: ProdContext,
	action: Action,
): Promise<ProbeResult> {
	if (action === "health") return health(ctx);
	return info(ctx);
}

async function health(ctx: ProdContext): Promise<ProbeResult> {
	const state = await dockerState(ctx, ctx.containers.dragonfly);
	if (!containerHealthOk(state)) {
		return {
			id: "dragonfly",
			action: "health",
			ok: false,
			summary: `container ${state.status}${state.health ? ` (health: ${state.health})` : ""}`,
		};
	}

	const ping = await dockerExec(ctx, ctx.containers.dragonfly, [
		"redis-cli",
		"-p",
		"6379",
		"PING",
	]);
	const pong = ping.stdout.trim() === "PONG";
	if (!pong) {
		return {
			id: "dragonfly",
			action: "health",
			ok: false,
			summary: "redis-cli PING did not return PONG",
			detail: ping.stdout || ping.stderr || undefined,
		};
	}

	return {
		id: "dragonfly",
		action: "health",
		ok: true,
		summary: "PONG",
	};
}

async function info(ctx: ProdContext): Promise<ProbeResult> {
	const memory = await dockerExec(ctx, ctx.containers.dragonfly, [
		"redis-cli",
		"-p",
		"6379",
		"INFO",
		"memory",
	]);
	const stats = await dockerExec(ctx, ctx.containers.dragonfly, [
		"redis-cli",
		"-p",
		"6379",
		"INFO",
		"stats",
	]);

	const ok = memory.code === 0 && stats.code === 0;
	const detail = [
		`--- memory ---`,
		memory.stdout,
		`--- stats ---`,
		stats.stdout,
	]
		.filter(Boolean)
		.join("\n")
		.trim();

	return {
		id: "dragonfly",
		action: "info",
		ok,
		summary: ok ? "redis INFO memory + stats" : "redis INFO failed",
		detail: detail || undefined,
	};
}
