import env from "@/env";
import { getServerRole } from "@/lib/platform/role";

/** Split deploys must not run the local monolith role outside `DEPLOYMENT=local`. */
export function validateServerRoleForDeployment(): void {
	if (env.DEPLOYMENT === "local" || env.DEPLOYMENT === "staging") return;
	if (getServerRole() === "all") {
		throw new Error(
			`SERVER_ROLE=all is only allowed for DEPLOYMENT=local; use api or worker per process (current DEPLOYMENT=${env.DEPLOYMENT})`,
		);
	}
}
