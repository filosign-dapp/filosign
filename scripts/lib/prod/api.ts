import {
	containerHealthOk,
	dockerExec,
	dockerState,
	sshCapture,
} from "./ssh.ts";
import type { Action, ProbeResult, ProdContext } from "./types.ts";

export async function probe(
	ctx: ProdContext,
	action: Action,
): Promise<ProbeResult> {
	if (action === "health") return health(ctx);
	return info(ctx);
}

async function health(ctx: ProdContext): Promise<ProbeResult> {
	const state = await dockerState(ctx, ctx.containers.api);
	if (!containerHealthOk(state)) {
		return {
			id: "api",
			action: "health",
			ok: false,
			summary: `container ${state.status}${state.health ? ` (health: ${state.health})` : ""}`,
		};
	}

	const curl = await dockerExec(ctx, ctx.containers.api, [
		"curl",
		"-fsS",
		"http://127.0.0.1:3000/health",
	]);
	if (curl.code !== 0) {
		return {
			id: "api",
			action: "health",
			ok: false,
			summary: "/health request failed",
			detail: curl.stderr || curl.stdout || undefined,
		};
	}

	let parsed: { ok?: boolean } = {};
	try {
		parsed = JSON.parse(curl.stdout) as { ok?: boolean };
	} catch {
		return {
			id: "api",
			action: "health",
			ok: false,
			summary: "invalid /health JSON",
			detail: curl.stdout,
		};
	}

	if (!parsed.ok) {
		return {
			id: "api",
			action: "health",
			ok: false,
			summary: "/health returned ok: false",
			detail: curl.stdout,
		};
	}

	return {
		id: "api",
		action: "health",
		ok: true,
		summary: "/health ok",
	};
}

async function info(ctx: ProdContext): Promise<ProbeResult> {
	const healthResult = await health(ctx);
	const started = await sshCapture(
		ctx,
		`docker inspect --format '{{.State.StartedAt}}' ${ctx.containers.api}`,
	);
	const curl = await dockerExec(ctx, ctx.containers.api, [
		"curl",
		"-fsS",
		"http://127.0.0.1:3000/health",
	]);

	const detail = [
		started.code === 0 ? `started: ${started.stdout}` : null,
		curl.code === 0
			? `GET /health: ${curl.stdout}`
			: curl.stderr || curl.stdout,
	]
		.filter(Boolean)
		.join("\n");

	return {
		id: "api",
		action: "info",
		ok: healthResult.ok && started.code === 0,
		summary: healthResult.ok ? "api status" : "api unhealthy",
		detail: detail || undefined,
	};
}
