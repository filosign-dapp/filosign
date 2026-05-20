import {
	createProcedureUtils,
	createTanstackQueryUtils,
} from "@orpc/tanstack-query";
import type { AppRouterClient } from "./app-router-types";

const ROOT = ["filosign"] as const;

/** TanStack helpers with `filosign` + domain prefix (e.g. `filosign`, `files`, …). */
export function createFilosignRpcQueryUtils(client: AppRouterClient) {
	return {
		healthCheck: createProcedureUtils(client.healthCheck, {
			path: [...ROOT, "healthCheck"],
		}),
		runtime: createProcedureUtils(client.runtime, {
			path: [...ROOT, "runtime"],
		}),
		auth: createTanstackQueryUtils(client.auth, {
			path: [...ROOT, "auth"],
		}),
		tx: createTanstackQueryUtils(client.tx, {
			path: [...ROOT, "tx"],
		}),
		storage: createTanstackQueryUtils(client.storage, {
			path: [...ROOT, "storage"],
		}),
		files: createTanstackQueryUtils(client.files, {
			path: [...ROOT, "files"],
		}),
		sharing: createTanstackQueryUtils(client.sharing, {
			path: [...ROOT, "sharing"],
		}),
		users: createTanstackQueryUtils(client.users, {
			path: [...ROOT, "users"],
		}),
		billing: createTanstackQueryUtils(client.billing, {
			path: [...ROOT, "billing"],
		}),
		orgs: createTanstackQueryUtils(client.orgs, {
			path: [...ROOT, "orgs"],
		}),
		metrics: createTanstackQueryUtils(client.metrics, {
			path: [...ROOT, "metrics"],
		}),
	};
}
