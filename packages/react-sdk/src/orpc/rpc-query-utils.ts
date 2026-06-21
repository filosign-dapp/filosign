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
		tx: createTanstackQueryUtils(client.tx, {
			path: [...ROOT, "tx"],
		}),
		storage: createTanstackQueryUtils(client.storage, {
			path: [...ROOT, "storage"],
		}),
		files: createTanstackQueryUtils(client.files, {
			path: [...ROOT, "files"],
		}),
		users: createTanstackQueryUtils(client.users, {
			path: [...ROOT, "users"],
		}),
		billing: createTanstackQueryUtils(client.billing, {
			path: [...ROOT, "billing"],
		}),
		archival: createTanstackQueryUtils(client.archival, {
			path: [...ROOT, "archival"],
		}),
		orgs: createTanstackQueryUtils(client.orgs, {
			path: [...ROOT, "orgs"],
		}),
		metrics: createTanstackQueryUtils(client.metrics, {
			path: [...ROOT, "metrics"],
		}),
		settlements: createTanstackQueryUtils(client.settlements, {
			path: [...ROOT, "settlements"],
		}),
		attachments: createTanstackQueryUtils(client.attachments, {
			path: [...ROOT, "attachments"],
		}),
		drafts: createTanstackQueryUtils(client.drafts, {
			path: [...ROOT, "drafts"],
		}),
		documents: createTanstackQueryUtils(client.documents, {
			path: [...ROOT, "documents"],
		}),
		notifications: createTanstackQueryUtils(client.notifications, {
			path: [...ROOT, "notifications"],
		}),
		platformAccess: createTanstackQueryUtils(client.platformAccess, {
			path: [...ROOT, "platformAccess"],
		}),
		platformAdmin: createTanstackQueryUtils(client.platformAdmin, {
			path: [...ROOT, "platformAdmin"],
		}),
		catalog: createTanstackQueryUtils(client.catalog, {
			path: [...ROOT, "catalog"],
		}),
		feedback: createTanstackQueryUtils(client.feedback, {
			path: [...ROOT, "feedback"],
		}),
	};
}
