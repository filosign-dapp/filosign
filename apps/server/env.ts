import { DEPLOYMENTS } from "@filosign/shared";
import { zEvmAddress, zEvmPrivateKey } from "@filosign/shared/zod";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import {
	emitCriticalPlatformEventFromProcessEnv,
	PLATFORM_ALERT_EVENTS,
} from "@/lib/platform/analytics";
import { validateDeploymentEnv } from "@/lib/platform/validate-deployment-env";

const parsedEnv = createEnv({
	server: {
		DEPLOYMENT: z.enum(DEPLOYMENTS),
		/** `api` = HTTP only; `worker` = crons + heartbeat; `all` = local dev monolith. */
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
		FC_SERVER_PRIVATE_KEY: zEvmPrivateKey(),
		FC_SERVER_ADDRESS: zEvmAddress(),
		/** Synapse dataset for platform FOC uploads; inferred from foc_objects when unset. */
		FC_SYNAPSE_DATASET_ID: z.coerce.number().int().positive().optional(),
		PG_URI: z.string().min(1),
		DB_NAME: z.string().min(1),
		SERVER_URL: z.url(),
		CLIENT_URL: z.url(),
		ASTRO_URL: z.url(),
		RESEND_API_KEY: z.string().min(1),
		RESEND_FROM_EMAIL: z.email(),
		RESEND_ENABLED: z
			.string()
			.default("true")
			.transform((v) => v === "true"),
		SES_ENABLED: z
			.string()
			.default("false")
			.transform((v) => v === "true"),
		SES_REGION: z.string().min(1).optional(),
		SES_FROM_EMAIL: z.email().optional(),
		SES_CONFIGURATION_SET: z.string().min(1).optional(),
		AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
		AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
		CHAIN: z.enum(["local", "testnet", "mainnet"]),
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
		ADMIN_WALLETS: z.string().optional(),
		PLATFORM_ADMIN_EMAILS: z.string().optional(),
		INVITE_TTL_DAYS: z.coerce.number().int().min(1).default(7),
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
		DODO_PRODUCT_ID_ARCHIVAL_BUNDLE_5Y: z.string().min(1).optional(),
		ARCHIVAL_EXPORT_GRACE_DAYS: z.coerce.number().int().min(1).default(30),
		/** Days after envelope completion before FOC replicate job may run (R2 stays primary). */
		R2_HOT_DAYS: z.coerce.number().int().min(1).default(30),
		/** When true: FOC backup (Synapse replicate + FOC CDN downloads). When false: R2 only. */
		TEST_FOC: z
			.string()
			.default("false")
			.transform((v) => v === "true"),
		/** Days to retain data after workspace subscription ends (FOC + hot storage policy). */
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
