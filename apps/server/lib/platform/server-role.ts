import env from "@/env";

export const SERVER_ROLES = ["api", "worker", "all"] as const;
export type ServerRole = (typeof SERVER_ROLES)[number];

export function getServerRole(): ServerRole {
	return env.SERVER_ROLE;
}

/** HTTP + oRPC (api or local all-in-one). */
export function runsHttpServer(): boolean {
	const role = getServerRole();
	return role === "api" || role === "all";
}

/** Bun.cron + relayer monitors (worker or local all-in-one). */
export function runsWorkerTasks(): boolean {
	const role = getServerRole();
	return role === "worker" || role === "all";
}

export function assertWorkerRole(): void {
	if (!runsWorkerTasks()) {
		throw new Error(
			`SERVER_ROLE=${getServerRole()} cannot run worker entry (expected worker or all)`,
		);
	}
}
