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
	const state = await dockerState(ctx, ctx.containers.postgres);
	if (!containerHealthOk(state)) {
		return {
			id: "postgres",
			action: "health",
			ok: false,
			summary: `container ${state.status}${state.health ? ` (health: ${state.health})` : ""}`,
		};
	}

	const ready = await dockerExec(ctx, ctx.containers.postgres, [
		"pg_isready",
		"-U",
		ctx.pgUser,
		"-d",
		ctx.pgDb,
	]);
	if (ready.code !== 0) {
		return {
			id: "postgres",
			action: "health",
			ok: false,
			summary: "pg_isready failed",
			detail: ready.stderr || ready.stdout,
		};
	}

	return {
		id: "postgres",
		action: "health",
		ok: true,
		summary: "pg_isready accepting connections",
	};
}

async function info(ctx: ProdContext): Promise<ProbeResult> {
	const sql = `
SELECT version() AS version;
SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size;
SELECT count(*)::int AS active FROM pg_stat_activity WHERE datname = current_database();
SELECT count(*)::int AS migrations FROM drizzle.__drizzle_migrations;
`.trim();

	const r = await dockerExec(ctx, ctx.containers.postgres, [
		"psql",
		"-U",
		ctx.pgUser,
		"-d",
		ctx.pgDb,
		"-v",
		"ON_ERROR_STOP=0",
		"-c",
		sql,
	]);

	const ok = r.code === 0;
	const detail = [r.stdout, r.stderr].filter(Boolean).join("\n").trim();
	const summary = ok ? "postgres metrics" : "psql returned errors (see detail)";

	return {
		id: "postgres",
		action: "info",
		ok,
		summary,
		detail: detail || undefined,
	};
}
