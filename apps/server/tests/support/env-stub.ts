import { mock } from "bun:test";
import { privateKeyToAccount } from "viem/accounts";

const testRelayerKey =
	"0x0000000000000000000000000000000000000000000000000000000000000001";

/** Minimal env stub for unit tests that must not load real `@/env` validation. */
export const testEnvStub = {
	NODE_ENV: "development" as const,
	TG_ANALYTICS: false,
	TG_ANALYTICS_BOT_TOKEN: "test-bot-token",
	TG_ANALYTICS_BOT_GROUP_ID: "test-group-id",
	S3_SECRET_ACCESS_KEY: "test-secret",
	S3_ACCESS_KEY_ID: "test-key",
	S3_BUCKET: "test-bucket",
	S3_ENDPOINT: "https://s3.example.com",
	FC_SERVER_PRIVATE_KEY: testRelayerKey,
	FC_SERVER_ADDRESS: privateKeyToAccount(testRelayerKey).address,
	PG_URI: "postgresql://u:p@localhost:5432/:dbname",
	DB_NAME: "test",
	SERVER_URL: "https://server.example.com",
	CLIENT_URL: "https://app.example.com",
	ASTRO_URL: "https://astro.example.com",
	RESEND_API_KEY: "re_test",
	RESEND_FROM_EMAIL: "test@example.com",
	RESEND_FROM_NAME: "Filosign",
	RESEND_ENABLED: false,
	CHAIN: "local" as const,
	DEPLOYMENT: "local" as const,
	SERVER_ROLE: "all" as const,
	DRAGONFLY_URL: "redis://localhost:6379",
	BULLMQ_PREFIX: "{filosign}",
	THIRDWEB_CLIENT_ID: "test-client",
	THIRDWEB_SECRET_KEY: "test-secret",
	DEBUG: false,
	POSTHOG_ENABLED: false,
	POSTHOG_PLATFORM_ALERTS: false,
	POSTHOG_HOST: "https://posthog.example.com",
	DODO_API_KEY: "dodo-test",
	DODO_WEBHOOK_KEY: "dodo-webhook-test",
	ARCHIVAL_EXPORT_GRACE_DAYS: 30,
	R2_HOT_DAYS: 30,
	TEST_FOC: false,
	WORKSPACE_CHURN_GRACE_DAYS: 90,
};

/** Re-apply preload env stub after `mock.restore()`. */
export function restoreTestEnvMock(): void {
	mock.module("@/env", () => ({
		default: testEnvStub,
	}));
}
