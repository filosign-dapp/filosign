import type { ChainKey } from "@filosign/contracts";
import type { Deployment } from "@filosign/shared";
import type { Chain } from "viem";
import config from "@/config";
import env from "@/env";

export type PlatformRuntime = {
	uptime: number;
	chain: Chain;
	chainKey: ChainKey;
	deployment: Deployment;
};

export async function loadPlatformRuntime(): Promise<PlatformRuntime> {
	return {
		uptime: process.uptime(),
		chain: config.runtimeChain,
		chainKey: config.chainKey,
		deployment: env.DEPLOYMENT,
	};
}
