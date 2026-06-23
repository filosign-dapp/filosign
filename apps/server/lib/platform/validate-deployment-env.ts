import type { ChainKey } from "@filosign/evm";
import { assertDeploymentChain, type Deployment } from "@filosign/shared";

type ServerEnvSlice = {
	DEPLOYMENT: Deployment;
	CHAIN: ChainKey;
	DODO_API_KEY?: string;
	DODO_WEBHOOK_KEY?: string;
	PIMLICO_API_KEY?: string;
	PIMLICO_SPONSORSHIP_ENABLED?: boolean;
	FOC_BACKUP_ENABLED?: boolean;
	FOC_RETRIEVAL?: boolean;
	FOC_WALLET_PRIVATE_KEY?: string;
	FOC_WALLET_ADDRESS?: string;
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

	if (env.CHAIN !== "local" && env.PIMLICO_SPONSORSHIP_ENABLED !== false) {
		if (!env.PIMLICO_API_KEY?.trim()) {
			throw new Error(`CHAIN=${env.CHAIN} requires PIMLICO_API_KEY`);
		}
	}

	if (env.FOC_BACKUP_ENABLED) {
		if (!env.FOC_WALLET_PRIVATE_KEY?.trim()) {
			throw new Error(
				"FOC_BACKUP_ENABLED=true requires FOC_WALLET_PRIVATE_KEY",
			);
		}
		if (!env.FOC_WALLET_ADDRESS?.trim()) {
			throw new Error("FOC_BACKUP_ENABLED=true requires FOC_WALLET_ADDRESS");
		}
	}

	if (env.FOC_RETRIEVAL && !env.FOC_BACKUP_ENABLED) {
		throw new Error("FOC_RETRIEVAL=true requires FOC_BACKUP_ENABLED=true");
	}
}
