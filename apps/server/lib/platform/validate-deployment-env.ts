import type { ChainKey } from "@filosign/contracts";
import { assertDeploymentChain, type Deployment } from "@filosign/shared";

type ServerEnvSlice = {
	DEPLOYMENT: Deployment;
	CHAIN: ChainKey;
	DODO_API_KEY?: string;
	DODO_WEBHOOK_KEY?: string;
};

export function validateDeploymentEnv(env: ServerEnvSlice): void {
	assertDeploymentChain({
		deployment: env.DEPLOYMENT,
		chain: env.CHAIN,
	});

	if (!env.DODO_API_KEY?.trim()) {
		throw new Error(`DEPLOYMENT=${env.DEPLOYMENT} requires DODO_API_KEY`);
	}
	if (!env.DODO_WEBHOOK_KEY?.trim()) {
		throw new Error(`DEPLOYMENT=${env.DEPLOYMENT} requires DODO_WEBHOOK_KEY`);
	}
}
