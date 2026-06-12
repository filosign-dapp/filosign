import { privateKeyToAccount } from "viem/accounts";

const relayerKey =
	"0x0000000000000000000000000000000000000000000000000000000000000001";

/**
 * Minimal process.env for drizzle-kit generate/check (no live DB required for generate).
 * Do not import from tests/support — tooling-only stub.
 */
export function loadDrizzleToolingEnv(): void {
	const pairs: Record<string, string> = {
		DEPLOYMENT: "local",
		NODE_ENV: "development",
		TG_ANALYTICS: "false",
		TG_ANALYTICS_BOT_TOKEN: "drizzle-tooling",
		TG_ANALYTICS_BOT_GROUP_ID: "0",
		S3_SECRET_ACCESS_KEY: "drizzle-tooling",
		S3_ACCESS_KEY_ID: "drizzle-tooling",
		S3_BUCKET: "drizzle-tooling",
		S3_ENDPOINT: "https://s3.example.com",
		FC_SERVER_PRIVATE_KEY: relayerKey,
		FC_SERVER_ADDRESS: privateKeyToAccount(relayerKey).address,
		PG_URI: "postgresql://filosign:filosign@localhost:5432/:dbname",
		DB_NAME: "filosign",
		SERVER_URL: "http://localhost:3000",
		CLIENT_URL: "http://localhost:3001",
		ASTRO_URL: "http://localhost:3002",
		RESEND_API_KEY: "re_drizzle_tooling",
		RESEND_FROM_EMAIL: "tooling@example.com",
		RESEND_FROM_PERSONAL_EMAIL: "personal@example.com",
		RESEND_ENABLED: "false",
		SES_ENABLED: "false",
		CHAIN: "local",
		DRAGONFLY_URL: "redis://localhost:6379",
		THIRDWEB_CLIENT_ID: "drizzle-tooling",
		THIRDWEB_SECRET_KEY: "drizzle-tooling",
		DEBUG: "false",
		POSTHOG_ENABLED: "false",
		POSTHOG_HOST: "https://posthog.example.com",
		DODO_API_BASE: "https://test.dodopayments.com",
	};

	for (const [key, value] of Object.entries(pairs)) {
		if (process.env[key] === undefined) {
			process.env[key] = value;
		}
	}
}
