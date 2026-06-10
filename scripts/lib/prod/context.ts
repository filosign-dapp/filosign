import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { die } from "../cli.ts";
import type { ProdContext } from "./types.ts";

const appProject = process.env.COMPOSE_PROJECT_APP || "filosign-app";
const dataProject = process.env.COMPOSE_PROJECT_DATA || "filosign-data";

export const CONTAINERS = {
	postgres: process.env.CONTAINER_POSTGRES || `${dataProject}-postgres-1`,
	dragonfly: process.env.CONTAINER_DRAGONFLY || `${dataProject}-dragonfly-1`,
	api: process.env.CONTAINER_API || `${appProject}-api-1`,
	worker: process.env.CONTAINER_WORKER || `${appProject}-worker-1`,
};

export const STANZA = "filosign";
export const PG_USER = "filosign";
export const PG_DB = "filosign";

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

export function createProdContext(root: string): ProdContext {
	loadDeployEnv(root);
	const ssh = process.env.FILOSIGN_PROD_SSH?.trim();
	if (!ssh) die("Set FILOSIGN_PROD_SSH=root@vps in deploy/.env");

	return {
		root,
		ssh,
		stanza: STANZA,
		pgUser: PG_USER,
		pgDb: PG_DB,
		containers: { ...CONTAINERS },
	};
}
