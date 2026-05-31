import { DEPLOYMENTS } from "@filosign/shared";
import { zEvmAddress, zEvmPrivateKey } from "@filosign/shared/zod";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { PLATFORM_ALERT_EVENTS } from "@/lib/platform/analytics/events";
import { emitCriticalPlatformEventFromProcessEnv } from "@/lib/platform/analytics/platform-alerts-env";
import { validateDeploymentEnv } from "@/lib/platform/validate-deployment-env";

const parsedEnv = createEnv({
	server: {
		DEPLOYMENT: z.enum(DEPLOYMENTS),
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
		CHAIN: z.enum(["local", "testnet", "mainnet"]),
		PORT: z
			.string()
			.transform((v) => parseInt(v, 10))
			.optional(),
		DRAGONFLY_URL: z.string().min(1),
		THIRDWEB_CLIENT_ID: z.string().min(1),
		THIRDWEB_SECRET_KEY: z.string().min(1),
		DEBUG: z
			.enum(["true", "false"])
			.default("false")
			.transform((v) => v === "true"),
		POSTHOG_API_KEY: z.string().min(1).optional(),
		POSTHOG_HOST: z.url().default("https://us.i.posthog.com"),
		POSTHOG_ENABLED: z
			.string()
			.default("false")
			.transform((v) => v === "true"),
		ADMIN_WALLETS: z.string().optional(),
		PLATFORM_ADMIN_EMAILS: z.string().optional(),
		INVITE_TTL_DAYS: z.coerce.number().int().min(1).default(7),
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
