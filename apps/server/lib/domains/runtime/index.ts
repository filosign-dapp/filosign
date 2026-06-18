import type { ChainKey } from "@filosign/evm";
import type { Deployment, SignupPolicy } from "@filosign/shared";
import type { Chain } from "viem";
import config from "@/config";
import env from "@/env";
import {
	serverEffectiveSignupPolicy,
	serverPublicCheckoutEnabled,
} from "@/lib/platform/public-fences";

export type PlatformRuntime = {
	uptime: number;
	chain: Chain;
	chainKey: ChainKey;
	deployment: Deployment;
	signupPolicy: SignupPolicy;
	publicCheckoutEnabled: boolean;
};

export async function loadPlatformRuntime(): Promise<PlatformRuntime> {
	return {
		uptime: process.uptime(),
		chain: config.runtimeChain,
		chainKey: config.chainKey,
		deployment: env.DEPLOYMENT,
		signupPolicy: serverEffectiveSignupPolicy(),
		publicCheckoutEnabled: serverPublicCheckoutEnabled(),
	};
}
