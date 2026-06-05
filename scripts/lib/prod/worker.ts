import {
	containerHealthOk,
	dockerExec,
	dockerState,
} from "./ssh.ts";
import type { Action, ProbeResult, ProdContext } from "./types.ts";

const HEARTBEAT_KEY = "fs:worker:heartbeat";
const MAX_AGE_MS = 90_000;

export async function probe(
	ctx: ProdContext,
	action: Action,
): Promise<ProbeResult> {
	if (action === "health") return health(ctx);
	return info(ctx);
}

async function health(ctx: ProdContext): Promise<ProbeResult> {
	const state = await dockerState(ctx, ctx.containers.worker);
	if (!containerHealthOk(state)) {
		return {
			id: "worker",
			action: "health",
			ok: false,
			summary: `container ${state.status}${state.health ? ` (health: ${state.health})` : ""}`,
		};
	}

	const check = await dockerExec(ctx, ctx.containers.worker, [
		"./worker-healthcheck",
	]);
	if (check.code !== 0) {
		return {
			id: "worker",
			action: "health",
			ok: false,
			summary: "worker-healthcheck failed",
			detail: check.stderr || check.stdout || undefined,
		};
	}

	return {
		id: "worker",
		action: "health",
		ok: true,
		summary: "worker-healthcheck OK",
	};
}

async function info(ctx: ProdContext): Promise<ProbeResult> {
	const healthResult = await health(ctx);
	const hb = await dockerExec(ctx, ctx.containers.dragonfly, [
		"redis-cli",
		"-p",
		"6379",
		"GET",
		HEARTBEAT_KEY,
	]);

	let heartbeatLine = "heartbeat: (missing)";
	let heartbeatFresh = false;
	if (hb.stdout.trim()) {
		const ts = Date.parse(hb.stdout.trim());
		if (Number.isNaN(ts)) {
			heartbeatLine = `heartbeat: invalid timestamp (${hb.stdout.trim()})`;
		} else {
			const ageMs = Date.now() - ts;
			heartbeatFresh = ageMs <= MAX_AGE_MS;
			heartbeatLine = `heartbeat: ${hb.stdout.trim()} (age ${Math.round(ageMs / 1000)}s, max ${MAX_AGE_MS / 1000}s)`;
		}
	}

	const detail = [heartbeatLine, healthResult.detail]
		.filter(Boolean)
		.join("\n");

	return {
		id: "worker",
		action: "info",
		ok: healthResult.ok && heartbeatFresh,
		summary: healthResult.ok ? "worker status" : "worker unhealthy",
		detail: detail || undefined,
	};
}
