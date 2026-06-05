import type { Deployment } from "@filosign/shared";
import { dodoLive } from "@filosign/shared";

export function resolveDodoLiveMode(args: {
	deployment: Deployment;
	dodoLiveEnv?: "true" | "false";
}): boolean {
	if (args.dodoLiveEnv === "false") return false;
	if (args.dodoLiveEnv === "true") return true;
	return dodoLive(args.deployment);
}
