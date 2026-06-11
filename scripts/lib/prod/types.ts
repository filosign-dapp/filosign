export type ServiceId = "postgres" | "backups" | "dragonfly" | "api" | "worker";

export type Action = "health" | "info";

export const ALL_SERVICES: readonly ServiceId[] = [
	"postgres",
	"backups",
	"dragonfly",
	"api",
	"worker",
] as const;

export type ProbeResult = {
	id: ServiceId;
	action: Action;
	ok: boolean;
	summary: string;
	detail?: string;
};

import type { ProdLog } from "./log.ts";

export type ProdContext = {
	root: string;
	ssh: string;
	stanza: string;
	pgUser: string;
	pgDb: string;
	verbose: boolean;
	log: ProdLog;
	containers: {
		postgres: string;
		dragonfly: string;
		api: string;
		worker: string;
	};
};

export type ParsedProdArgv =
	| { kind: "migrate"; verbose: boolean }
	| { kind: "probes"; targets: ServiceId[]; action: Action; verbose: boolean };
