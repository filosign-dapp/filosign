import type { ChainKey } from "@filosign/contracts";
import type { Address, Chain } from "viem";
import config from "@/config";
import { fsContracts } from "@/lib/evm";

export type PlatformRuntime = {
	uptime: number;
	serverAddressSynapse: string;
	chain: Chain;
	chainKey: ChainKey;
	treasury: Address;
};

export async function loadPlatformRuntime(): Promise<PlatformRuntime> {
	const treasury = await fsContracts.FSManager.read.treasury();
	return {
		uptime: process.uptime(),
		serverAddressSynapse: config.serverAddressSynapse,
		chain: config.runtimeChain,
		chainKey: config.chainKey,
		treasury,
	};
}
