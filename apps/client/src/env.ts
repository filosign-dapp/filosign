import { assertDeploymentChain, DEPLOYMENTS } from "@filosign/shared";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const parsedEnv = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_DEPLOYMENT: z.enum(DEPLOYMENTS),
		VITE_CHAIN: z.enum(["local", "testnet", "mainnet"]),
		VITE_THIRDWEB_CLIENT_ID: z.string().min(1),
		/** Production mainnet primary JSON-RPC for reads; ignored on other deployments. */
		VITE_CHAIN_RPC_URL: z.url().optional(),
		VITE_SERVER_URL: z.url(),
		VITE_ASTRO_URL: z.url(),
		VITE_CLIENT_URL: z.url(),
		VITE_POSTHOG_KEY: z.string().min(1).optional(),
		VITE_POSTHOG_HOST: z.url(),
		VITE_POSTHOG_ENABLED: z
			.enum(["true", "false", "1", "0"])
			.optional()
			.transform((v) => v === "true" || v === "1"),
		VITE_POSTHOG_SESSION_REPLAY: z
			.enum(["true", "false", "1", "0"])
			.optional()
			.transform((v) => v === "true" || v === "1"),
	},
	runtimeEnv: import.meta.env,
	emptyStringAsUndefined: true,
});

assertDeploymentChain({
	deployment: parsedEnv.VITE_DEPLOYMENT,
	chain: parsedEnv.VITE_CHAIN,
});

export const env = parsedEnv;
export default env;
