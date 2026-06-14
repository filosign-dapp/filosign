import os from "node:os";
import {
	createInMemoryDedupe,
	createLoggerRuntime,
	createTelegramTransport,
	type LoggerEvent,
	type TelegramTransportOptions,
} from "@filosign/logger";
import {
	type AnalyticsProperties,
	scrubAnalyticsProperties,
} from "@filosign/shared";
import env from "@/env";
import { captureEvent } from "./analytics";

// ==========================================
// 1. Alerting Events Schema & Constants
// ==========================================
export const PLATFORM_ALERT_EVENTS = {
	serverHttp500: "server.http_500",
	serverCronJobFailed: "server.cron_job_failed",
	serverBootstrapFailed: "server.bootstrap_failed",
	serverDbInfraError: "server.db_infra_error",
	serverRelayerGasLow: "server.relayer_gas_low",
	serverFocFilLow: "server.foc_fil_low",
	serverFocUsdfcLow: "server.foc_usdfc_low",
	serverRpcDegraded: "server.rpc_degraded",
	settlementsRelayPayoutFailed: "settlements.relay_payout_failed",
	serverPgbackrestFailed: "server.pgbackrest_failed",
	serverBullmqJobFailed: "server.bullmq_job_failed",
	serverStarted: "server.started",
} as const;

export const PLATFORM_ALERT_POSTHOG_EVENT = "platform_alert" as const;

export type PlatformAlertEventName =
	(typeof PLATFORM_ALERT_EVENTS)[keyof typeof PLATFORM_ALERT_EVENTS];

type BaseAlertEvent = {
	severity: "error" | "critical";
	message: string;
	context?: Record<string, unknown>;
};

export type PlatformAlertEvent =
	| (BaseAlertEvent & {
			name: typeof PLATFORM_ALERT_EVENTS.serverHttp500;
			context: {
				method: string;
				path: string;
				status: number;
				durationMs: number;
			};
	  })
	| (BaseAlertEvent & {
			name: typeof PLATFORM_ALERT_EVENTS.serverCronJobFailed;
			context: {
				job: string;
				error: string;
			};
	  })
	| (BaseAlertEvent & {
			name: typeof PLATFORM_ALERT_EVENTS.serverBootstrapFailed;
			context: {
				stage: string;
				error: string;
			};
	  })
	| (BaseAlertEvent & {
			name: typeof PLATFORM_ALERT_EVENTS.serverDbInfraError;
			context: {
				source: string;
				error: string;
			};
	  })
	| (BaseAlertEvent & {
			name: typeof PLATFORM_ALERT_EVENTS.serverRelayerGasLow;
			context: {
				wallet: string;
				balanceWei: string;
				thresholdWei: string;
				deployment: string;
				chain: string;
			};
	  })
	| (BaseAlertEvent & {
			name: typeof PLATFORM_ALERT_EVENTS.serverFocFilLow;
			context: {
				wallet: string;
				balanceWei: string;
				thresholdWei: string;
				deployment: string;
				chain: string;
				token: "FIL";
			};
	  })
	| (BaseAlertEvent & {
			name: typeof PLATFORM_ALERT_EVENTS.serverFocUsdfcLow;
			context: {
				wallet: string;
				balanceWei: string;
				thresholdWei: string;
				deployment: string;
				chain: string;
				token: "USDFC";
			};
	  })
	| (BaseAlertEvent & {
			name: typeof PLATFORM_ALERT_EVENTS.serverRpcDegraded;
			context: {
				rpcUrl: string;
				fallbackEnabled: boolean;
				chainKey: string;
				error: string;
			};
	  })
	| (BaseAlertEvent & {
			name: typeof PLATFORM_ALERT_EVENTS.settlementsRelayPayoutFailed;
			context: {
				onChainRuleId: string;
				pieceCid?: string;
				status: string;
				error: string;
				txHash?: string;
			};
	  })
	| (BaseAlertEvent & {
			name: typeof PLATFORM_ALERT_EVENTS.serverPgbackrestFailed;
			context: {
				stanza: string;
				container: string;
				cmd: string;
			};
	  })
	| (BaseAlertEvent & {
			name: typeof PLATFORM_ALERT_EVENTS.serverBullmqJobFailed;
			context: {
				queueName: string;
				jobId: string;
				error: string;
				outboxId?: string;
			};
	  });

// ==========================================
// 2. Alert PostHog Mirror Helper
// ==========================================
const PLATFORM_ALERT_DEDUPE_MS = 5 * 60 * 1000;
const SERVICE_DISTINCT_ID = "service:filosign-server";

let postHogDedupe = createInMemoryDedupe({
	windowMs: PLATFORM_ALERT_DEDUPE_MS,
});

export function resetPlatformAlertPostHogDedupeForTests(): void {
	postHogDedupe = createInMemoryDedupe({ windowMs: PLATFORM_ALERT_DEDUPE_MS });
}

function toLoggerEvent(event: PlatformAlertEvent): LoggerEvent {
	return {
		name: event.name,
		severity: event.severity,
		message: event.message,
		context: event.context as Record<string, unknown> | undefined,
	};
}

function flattenAlertContext(
	context: Record<string, unknown>,
): AnalyticsProperties {
	const flat: AnalyticsProperties = {};
	for (const [key, value] of Object.entries(context)) {
		if (
			typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "boolean"
		) {
			flat[key] = value;
		}
	}
	return flat;
}

export function platformAlertPostHogProperties(
	event: PlatformAlertEvent,
): AnalyticsProperties {
	const base: AnalyticsProperties = {
		alert_name: event.name,
		severity: event.severity,
		message: event.message,
	};
	const ctx = event.context;
	if (!ctx) {
		return scrubAnalyticsProperties(base);
	}
	return scrubAnalyticsProperties({
		...base,
		...flattenAlertContext(ctx as Record<string, unknown>),
	});
}

function postHogMirrorEnabledFromProcessEnv(): boolean {
	return (
		process.env.POSTHOG_PLATFORM_ALERTS === "true" &&
		process.env.POSTHOG_ENABLED === "true" &&
		Boolean(process.env.POSTHOG_HOST?.trim()) &&
		Boolean(process.env.POSTHOG_API_KEY?.trim())
	);
}

export function mirrorPlatformAlertToPostHog(
	event: PlatformAlertEvent,
	enabled: boolean = postHogMirrorEnabledFromProcessEnv() ||
		(env.POSTHOG_PLATFORM_ALERTS &&
			env.POSTHOG_ENABLED &&
			Boolean(env.POSTHOG_HOST?.trim()) &&
			Boolean(env.POSTHOG_API_KEY?.trim())),
): void {
	if (!enabled) return;
	if (!postHogDedupe.shouldSend(toLoggerEvent(event))) return;

	try {
		captureEvent({
			distinctId: SERVICE_DISTINCT_ID,
			event: PLATFORM_ALERT_POSTHOG_EVENT,
			properties: platformAlertPostHogProperties(event),
		});
	} catch {
		// PostHog host / runtime unavailable
	}
}

export function mirrorPlatformAlertToPostHogFromProcessEnv(
	event: PlatformAlertEvent,
): void {
	mirrorPlatformAlertToPostHog(event, postHogMirrorEnabledFromProcessEnv());
}

// ==========================================
// 3. Platform Alerts Runtime & Output
// ==========================================
export function createPlatformAlertsRuntime(config: TelegramTransportOptions) {
	const dedupe = createInMemoryDedupe({
		windowMs: 5 * 60 * 1000,
	});

	return createLoggerRuntime({
		transports: [createTelegramTransport(config)],
		shouldSend: (event) => dedupe.shouldSend(event),
	});
}

let runtime: ReturnType<typeof createPlatformAlertsRuntime> | null = null;

export function resetPlatformAlertsRuntimeForTests(): void {
	runtime = null;
}

function getRuntime() {
	if (!runtime) {
		runtime = createPlatformAlertsRuntime({
			enabled: env.TG_ANALYTICS,
			botToken: env.TG_ANALYTICS_BOT_TOKEN,
			chatId: env.TG_ANALYTICS_BOT_GROUP_ID,
		});
	}
	return runtime;
}

export function emitCriticalPlatformEvent(
	event: PlatformAlertEvent,
): Promise<void> {
	mirrorPlatformAlertToPostHog(event);
	return getRuntime().emit({
		...event,
		timestamp: Date.now(),
	});
}

/** Telegram ping on successful bootstrap (ops connectivity check; not mirrored to PostHog). */
export function emitServerStartedPing(): Promise<void> {
	if (!env.TG_ANALYTICS) {
		return Promise.resolve();
	}

	const startedAt = new Date().toISOString();
	return getRuntime().emit({
		name: PLATFORM_ALERT_EVENTS.serverStarted,
		severity: "info",
		message: "Filosign server started",
		context: {
			startedAt,
			deployment: env.DEPLOYMENT,
			chain: env.CHAIN,
			serverRole: env.SERVER_ROLE,
			hostname: os.hostname(),
		},
		timestamp: Date.now(),
	});
}

// ==========================================
// 4. process.env Alerts (Bootstrap Fallback)
// ==========================================
function readTelegramConfigFromProcessEnv(): TelegramTransportOptions {
	return {
		enabled: process.env.TG_ANALYTICS === "true",
		botToken: process.env.TG_ANALYTICS_BOT_TOKEN ?? "",
		chatId: process.env.TG_ANALYTICS_BOT_GROUP_ID ?? "",
	};
}

export function emitCriticalPlatformEventFromProcessEnv(
	event: PlatformAlertEvent,
): Promise<void> {
	const dedupe = createInMemoryDedupe({
		windowMs: 5 * 60 * 1000,
	});
	const runtime = createLoggerRuntime({
		transports: [createTelegramTransport(readTelegramConfigFromProcessEnv())],
		shouldSend: (event) => dedupe.shouldSend(event),
	});
	mirrorPlatformAlertToPostHogFromProcessEnv(event);
	return runtime.emit({
		...event,
		timestamp: Date.now(),
	});
}
