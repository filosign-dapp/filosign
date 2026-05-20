import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		TG_ANALYTICS_BOT_GROUP_ID: z.string().min(1).optional(),
		TG_ANALYTICS_BOT_TOKEN: z.string().min(1).optional(),
		S3_SECRET_ACCESS_KEY: z.string().min(1),
		S3_ACCESS_KEY_ID: z.string().min(1),
		S3_BUCKET: z.string().min(1),
		S3_ENDPOINT: z.url(),
		EVM_PRIVATE_KEY_SYNAPSE: z.string().min(1),
		EVM_PRIVATE_KEY_SERVER: z.string().min(1),
		PG_URI: z.string().min(1),
		DB_NAME: z.string().min(1),
		/** Public API origin (no trailing slash). */
		SERVER_URL: z.url(),
		/** React app origin — CORS, email CTAs. */
		CLIENT_URL: z.url(),
		/** Marketing site origin — email static assets (`/logo.webp`, `/icons/*`). */
		ASTRO_URL: z.url(),
		RESEND_API_KEY: z.string().min(1),
		RESEND_FROM_EMAIL: z.email(),
		CHAIN: z.enum(["local", "testnet", "mainnet"]),
		PORT: z
			.string()
			.transform((v) => parseInt(v, 10))
			.optional(),
		JWT_SECRET: z.string().min(32),
		/** Dragonfly / Redis URL for auth cache (nonces, denylist, refresh). Falls back to Postgres when unset. */
		DRAGONFLY_URL: z.string().min(1).optional(),
		/** Same project client ID as `VITE_THIRDWEB_CLIENT_ID` on the client. */
		THIRDWEB_CLIENT_ID: z.string().min(1),
		THIRDWEB_SECRET_KEY: z.string().min(1),
		DEBUG: z
			.enum(["true", "false"])
			.default("false")
			.transform((v) => v === "true"),
		POSTHOG_API_KEY: z.string().min(1).optional(),
		POSTHOG_HOST: z.url().default("https://us.i.posthog.com"),
		POSTHOG_ENABLED: z.coerce.boolean().default(false),
		/** Comma-separated wallet addresses allowed to call metrics.* admin RPC. */
		ADMIN_WALLETS: z.string().optional(),
		/** Days until pending document, user, and org invites expire. */
		INVITE_TTL_DAYS: z.coerce.number().int().min(1).default(7),
	},
	runtimeEnv: Bun.env,
	emptyStringAsUndefined: true,
});

export default env;
