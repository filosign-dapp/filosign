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

export type ProdContext = {
	root: string;
	ssh: string;
	stanza: string;
	pgUser: string;
	pgDb: string;
	containers: {
		postgres: string;
		dragonfly: string;
		api: string;
		worker: string;
	};
};

export type ParsedProdArgv =
	| { kind: "migrate" }
	| { kind: "probes"; targets: ServiceId[]; action: Action };
