import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_CHAIN: z.enum(["local", "testnet", "mainnet"]),
		VITE_THIRDWEB_CLIENT_ID: z.string().min(1),
		VITE_SERVER_URL: z.url(),
		VITE_ASTRO_URL: z.url(),
		VITE_CLIENT_URL: z.url(),
		VITE_POSTHOG_KEY: z.string().min(1).optional(),
		VITE_POSTHOG_HOST: z.url().optional(),
		VITE_POSTHOG_ENABLED: z
			.enum(["true", "false", "1", "0"])
			.optional()
			.transform((v) => v === "true" || v === "1"),
	},
	runtimeEnv: import.meta.env,
	emptyStringAsUndefined: true,
});

export default env;
