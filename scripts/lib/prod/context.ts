import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { die } from "../cli.ts";
import { createProdLog } from "./log.ts";
import type { ProdContext } from "./types.ts";

function resolveContainers(): ProdContext["containers"] {
	const appProject = process.env.COMPOSE_PROJECT_APP || "filosign-app";
	const dataProject = process.env.COMPOSE_PROJECT_DATA || "filosign-data";
	return {
		postgres: process.env.CONTAINER_POSTGRES || `${dataProject}-postgres-1`,
		dragonfly: process.env.CONTAINER_DRAGONFLY || `${dataProject}-dragonfly-1`,
		api: process.env.CONTAINER_API || `${appProject}-api-1`,
		worker: process.env.CONTAINER_WORKER || `${appProject}-worker-1`,
	};
}

export const STANZA = "filosign";

const DEFAULT_PG_USER = "filosign";
const DEFAULT_PG_DB = "filosign-prod";

function envValue(...keys: string[]): string | undefined {
	for (const key of keys) {
		const value = process.env[key]?.trim();
		if (value) return value;
	}
	return undefined;
}

/** Match Infisical `DB_NAME` / Dokploy `POSTGRES_DB` for remote psql probes. */
export function resolveProdPgUser(): string {
	return (
		envValue("PROD_PG_USER", "POSTGRES_USER", "PG_USER") ?? DEFAULT_PG_USER
	);
}

export function resolveProdPgDb(): string {
	return (
		envValue("PROD_PG_DB", "DB_NAME", "POSTGRES_DB", "PG_DB") ?? DEFAULT_PG_DB
	);
}

function loadDeployEnv(root: string): void {
	const envPath = path.join(root, "deploy/.env");
	if (!existsSync(envPath)) return;
	for (const line of readFileSync(envPath, "utf8").split("\n")) {
		const t = line.trim();
		if (!t || t.startsWith("#")) continue;
		const i = t.indexOf("=");
		if (i > 0 && process.env[t.slice(0, i).trim()] === undefined) {
			process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
		}
	}
}

export function createProdContext(
	root: string,
	opts?: { verbose?: boolean; log?: ProdContext["log"] },
): ProdContext {
	loadDeployEnv(root);
	const ssh = process.env.FILOSIGN_PROD_SSH?.trim();
	if (!ssh) die("Set FILOSIGN_PROD_SSH=root@vps in deploy/.env");

	const verbose = opts?.verbose ?? true;
	const log = opts?.log ?? createProdLog(verbose);

	const pgUser = resolveProdPgUser();
	const pgDb = resolveProdPgDb();

	return {
		root,
		ssh,
		stanza: STANZA,
		pgUser,
		pgDb,
		verbose,
		log,
		containers: resolveContainers(),
	};
}
