import { DEPLOYMENTS } from "@filosign/shared";
import { zEvmAddress, zEvmPrivateKey } from "@filosign/shared/zod";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import {
	emitCriticalPlatformEventFromProcessEnv,
	PLATFORM_ALERT_EVENTS,
} from "@/lib/platform/analytics";
import { validateDeploymentEnv } from "@/lib/platform/validate-deployment-env";
import { validateEmailEnv } from "@/lib/platform/validate-email-env";

const parsedEnv = createEnv({
	server: {
		DEPLOYMENT: z.enum(DEPLOYMENTS),
		SERVER_ROLE: z.enum(["api", "worker", "all"]).default("all"),
		NODE_ENV: z.enum(["development", "production"]).default("production"),
		TG_ANALYTICS: z
			.string()
			.default("false")
			.transform((v) => v === "true"),
		TG_ANALYTICS_BOT_GROUP_ID: z.string().min(1),
		TG_ANALYTICS_BOT_TOKEN: z.string().min(1),
		S3_SECRET_ACCESS_KEY: z.string().min(1),
		S3_ACCESS_KEY_ID: z.string().min(1),
		S3_BUCKET: z.string().min(1),
		S3_ENDPOINT: z.url(),
		RELAYER_POOL: z.string().min(1),
		RELAYER_POOL_PRIVATE_KEYS: z.string().min(1),
		FOC_BACKUP_ENABLED: z
			.string()
			.default("false")
			.transform((v) => v === "true"),
		/** When true, downloads use FilBeam for replicated FOC objects instead of R2 presign. */
		FOC_RETRIEVAL: z
			.string()
			.default("false")
			.transform((v) => v === "true"),
		FOC_WALLET_PRIVATE_KEY: zEvmPrivateKey().optional(),
		FOC_WALLET_ADDRESS: zEvmAddress().optional(),
		FC_SYNAPSE_DATASET_ID: z.coerce.number().int().positive().optional(),
		PG_URI: z.string().min(1),
		DB_NAME: z.string().min(1),
		SERVER_URL: z.url(),
		CLIENT_URL: z.url(),
		ASTRO_URL: z.url(),
		EMAIL_PROVIDER: z.enum(["ses", "resend"]).default("ses"),
		RESEND_API_KEY: z.string().min(1).optional(),
		RESEND_FROM_EMAIL: z.email().optional(),
		RESEND_FROM_NAME: z.string().min(1).optional(),
		RESEND_ENABLED: z
			.string()
			.default("false")
			.transform((v) => v === "true"),
		SES_ENABLED: z
			.string()
			.default("true")
			.transform((v) => v === "true"),
		SES_REGION: z.string().min(1).optional(),
		SES_FROM_EMAIL: z.email().optional(),
		SES_FROM_NAME: z.string().min(1).optional(),
		SES_CONFIGURATION_SET: z.string().min(1).optional(),
		AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
		AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
		CHAIN: z.enum(["local", "testnet", "mainnet"]),
		/** Pimlico API key for server-side bundler/paymaster proxy (not exposed to client). */
		PIMLICO_API_KEY: z.string().min(1).optional(),
		/** When false, gas sponsorship proxy is disabled even if PIMLICO_API_KEY is set. */
		PIMLICO_SPONSORSHIP_ENABLED: z
			.string()
			.default("true")
			.transform((v) => v === "true"),
		/** Production mainnet primary JSON-RPC; public Base URL is automatic fallback. Ignored on other deployments. */
		CHAIN_RPC_URL: z.url().optional(),
		PORT: z
			.string()
			.transform((v) => parseInt(v, 10))
			.optional(),
		DRAGONFLY_URL: z.string().min(1),
		/** BullMQ queue prefix (Redis hashtag), e.g. `{filosign}`. */
		BULLMQ_PREFIX: z.string().min(1).default("{filosign}"),
		THIRDWEB_CLIENT_ID: z.string().min(1),
		THIRDWEB_SECRET_KEY: z.string().min(1),
		DEBUG: z
			.enum(["true", "false"])
			.default("false")
			.transform((v) => v === "true"),
		POSTHOG_API_KEY: z.string().min(1).optional(),
		POSTHOG_HOST: z.url(),
		POSTHOG_ENABLED: z
			.string()
			.default("false")
			.transform((v) => v === "true"),
		/** Mirror ops platform_alert events to PostHog (default off; Telegram remains primary). */
		POSTHOG_PLATFORM_ALERTS: z
			.string()
			.default("false")
			.transform((v) => v === "true"),
		ADMIN_WALLETS: z.string().optional(),
		PLATFORM_ADMIN_EMAILS: z.string().optional(),
		INVITE_TTL_DAYS: z.coerce.number().int().min(1).default(7),
		/** Unset → disabled on production, enabled on other deployments. */
		PUBLIC_CHECKOUT_ENABLED: z
			.enum(["true", "false"])
			.optional()
			.transform((v) => (v === undefined ? undefined : v === "true")),
		/** Unset → deployment default signup policy. */
		PUBLIC_SIGNUP_ENABLED: z
			.enum(["true", "false"])
			.optional()
			.transform((v) => (v === undefined ? undefined : v === "true")),
		/** Unset → live on `production`, test elsewhere. `false` → test_mode always. */
		DODO_LIVE: z.enum(["true", "false"]).optional(),
		DODO_API_KEY: z.string().min(1).optional(),
		DODO_WEBHOOK_KEY: z.string().min(1).optional(),
		DODO_API_BASE: z
			.url()
			.default("https://test.dodopayments.com")
			.transform((v) => v.replace(/\/+$/, "")),
		BILLING_RETURN_URL_ORIGINS: z.string().optional(),
		DODO_PRODUCT_ID_INDIVIDUAL_MONTHLY: z.string().min(1).optional(),
		DODO_PRODUCT_ID_INDIVIDUAL_YEARLY: z.string().min(1).optional(),
		DODO_PRODUCT_ID_TEAMS_MONTHLY: z.string().min(1).optional(),
		DODO_PRODUCT_ID_TEAMS_YEARLY: z.string().min(1).optional(),
		DODO_PRODUCT_ID_TEAMS_PRO_MONTHLY: z.string().min(1).optional(),
		DODO_PRODUCT_ID_TEAMS_PRO_YEARLY: z.string().min(1).optional(),
		DODO_PRODUCT_ID_ARCHIVAL_YEAR: z.string().min(1).optional(),
		DODO_PRODUCT_ID_ARCHIVAL_BUNDLE_3Y: z.string().min(1).optional(),
		ARCHIVAL_EXPORT_GRACE_DAYS: z.coerce.number().int().min(1).default(30),
		/** Days to retain data after workspace subscription ends (FOC retention policy). */
		WORKSPACE_CHURN_GRACE_DAYS: z.coerce.number().int().min(1).default(90),
	},
	runtimeEnv: Bun.env,
	emptyStringAsUndefined: true,
	onValidationError: (issues) => {
		console.error("Invalid server environment variables:", issues);
		void emitCriticalPlatformEventFromProcessEnv({
			name: PLATFORM_ALERT_EVENTS.serverBootstrapFailed,
			severity: "critical",
			message: "Server bootstrap validation failed",
			context: {
				stage: "env_validation",
				error: JSON.stringify(issues),
			},
		});
		throw new Error("Invalid environment variables");
	},
});

try {
	validateDeploymentEnv(parsedEnv);
	validateEmailEnv(parsedEnv);
} catch (error) {
	const message =
		error instanceof Error ? error.message : "Invalid deployment configuration";
	console.error(message);
	void emitCriticalPlatformEventFromProcessEnv({
		name: PLATFORM_ALERT_EVENTS.serverBootstrapFailed,
		severity: "critical",
		message: "Server bootstrap validation failed",
		context: {
			stage: "deployment_validation",
			error: message,
		},
	});
	throw error;
}

export const env = parsedEnv;
export default env;
