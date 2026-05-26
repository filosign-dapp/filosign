import type { ChainKey } from "@filosign/contracts";
import type { Chain } from "viem";
import config from "@/config";

export type PlatformRuntime = {
	uptime: number;
	chain: Chain;
	chainKey: ChainKey;
};

export async function loadPlatformRuntime(): Promise<PlatformRuntime> {
	return {
		uptime: process.uptime(),
		chain: config.runtimeChain,
		chainKey: config.chainKey,
	};
}
