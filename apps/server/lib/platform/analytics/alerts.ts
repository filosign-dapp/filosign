import os from "node:os";
import {
	createInMemoryDedupe,
	createLoggerRuntime,
	createTelegramTransport,
	type LoggerEvent,
	type TelegramTransportOptions,
} from "@filosign/logger";
import type {
	FeedbackFeatureArea,
	FeedbackKind,
	FeedbackPromptType,
} from "@filosign/shared";
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
	productFeedbackSubmitted: "product.feedback_submitted",
	platformAccessRequestSubmitted: "platform.access_request_submitted",
	payoutAccessRequestSubmitted: "platform.payout_access_request_submitted",
	partnerInviteRedeemed: "platform.partner_invite_redeemed",
	serverWorkerStale: "server.worker_stale",
	billingWebhookStuck: "billing.webhook_stuck",
	emailOutboxStuck: "email.outbox_stuck",
	billingSubscriptionProblem: "billing.subscription_problem",
	serverEmailDisabled: "server.email_disabled",
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
		windowMs: PLATFORM_ALERT_DEDUPE_MS,
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

/** Telegram ping when a user submits a platform access request (not mirrored to PostHog). */
export function emitPlatformAccessRequestPing(args: {
	email: string;
	name: string | null;
	company: string | null;
	message: string | null;
	planId: string | null;
	billingInterval: string | null;
	seatCount: number;
}): Promise<void> {
	return emitPlatformInfoEvent({
		name: PLATFORM_ALERT_EVENTS.platformAccessRequestSubmitted,
		message: "New platform access request",
		context: {
			email: args.email,
			name: args.name,
			company: args.company,
			planId: args.planId,
			billingInterval: args.billingInterval,
			seatCount: args.seatCount,
			message: args.message?.trim().slice(0, 500) ?? null,
			adminPath: "/admin/access-requests",
		},
	});
}

/** Telegram ping when a workspace requests payout feature access (not mirrored to PostHog). */
export function emitPayoutAccessRequestPing(args: {
	wallet: string;
	organizationId: string;
	organizationLegalName: string;
	organizationCountry: string;
	useCase: string;
	requesterName: string;
	requesterRole: string;
	externalWalletAccessRequested?: boolean;
	externalWalletUseCase?: string | null;
}): Promise<void> {
	return emitPlatformInfoEvent({
		name: PLATFORM_ALERT_EVENTS.payoutAccessRequestSubmitted,
		message: "New payout access request",
		context: {
			wallet: args.wallet,
			organizationId: args.organizationId,
			organizationLegalName: args.organizationLegalName,
			organizationCountry: args.organizationCountry,
			requesterName: args.requesterName,
			requesterRole: args.requesterRole,
			useCase: args.useCase.trim().slice(0, 500),
			externalWalletAccessRequested:
				args.externalWalletAccessRequested === true,
			externalWalletUseCase: args.externalWalletAccessRequested
				? (args.externalWalletUseCase?.trim().slice(0, 500) ?? null)
				: null,
			adminPath: "/admin/payout-access",
		},
	});
}

/** Telegram ping when a partner invite is redeemed (not mirrored to PostHog). */
export function emitPartnerInviteRedeemedPing(args: {
	wallet: string;
	email: string;
	inviteId: string;
	inviteKind: string;
	emailVariant: string | null;
	planId: string;
	trialDays: number;
}): Promise<void> {
	return emitPlatformInfoEvent({
		name: PLATFORM_ALERT_EVENTS.partnerInviteRedeemed,
		message: "Partner invite redeemed",
		context: {
			wallet: args.wallet,
			email: args.email,
			inviteId: args.inviteId,
			inviteKind: args.inviteKind,
			emailVariant: args.emailVariant,
			planId: args.planId,
			trialDays: args.trialDays,
			adminPath: "/admin/invites",
		},
	});
}

/** Telegram ping when a user submits in-app product feedback (not mirrored to PostHog). */
export function emitProductFeedbackPing(args: {
	walletAddress: string;
	organizationId: string | null;
	kind: FeedbackKind;
	featureArea: FeedbackFeatureArea;
	promptType: FeedbackPromptType;
	message: string;
	route: string | null;
	trigger: string | null;
	pieceCid: string | null;
}): Promise<void> {
	if (!env.TG_ANALYTICS) {
		return Promise.resolve();
	}

	return getRuntime().emit({
		name: PLATFORM_ALERT_EVENTS.productFeedbackSubmitted,
		severity: "info",
		message:
			args.kind === "bug"
				? "New bug report"
				: args.kind === "support"
					? "New support request"
					: "New user feedback",
		context: {
			wallet: args.walletAddress,
			organizationId: args.organizationId,
			kind: args.kind,
			featureArea: args.featureArea,
			promptType: args.promptType,
			trigger: args.trigger,
			route: args.route,
			pieceCid: args.pieceCid,
			message: args.message.trim().slice(0, 500),
		},
		timestamp: Date.now(),
	});
}

function emitPlatformInfoEvent(args: {
	name: string;
	message: string;
	context?: Record<string, unknown>;
}): Promise<void> {
	if (!env.TG_ANALYTICS) {
		return Promise.resolve();
	}
	return getRuntime().emit({
		name: args.name,
		severity: "info",
		message: args.message,
		context: args.context,
		timestamp: Date.now(),
	});
}

export function emitWorkerStaleAlert(args: {
	lastHeartbeatAt: string | null;
	staleForSec: number;
}): Promise<void> {
	if (!env.TG_ANALYTICS) {
		return Promise.resolve();
	}
	return getRuntime().emit({
		name: PLATFORM_ALERT_EVENTS.serverWorkerStale,
		severity: "error",
		message: "Worker heartbeat is stale",
		context: {
			lastHeartbeatAt: args.lastHeartbeatAt,
			staleForSec: args.staleForSec,
			deployment: env.DEPLOYMENT,
			serverRole: env.SERVER_ROLE,
		},
		timestamp: Date.now(),
	});
}

export function emitBillingWebhookStuckAlert(args: {
	receivedCount: number;
	failedCount: number;
	oldestReceivedAgeMin: number | null;
	reEnqueued: number;
}): Promise<void> {
	if (!env.TG_ANALYTICS) {
		return Promise.resolve();
	}
	return getRuntime().emit({
		name: PLATFORM_ALERT_EVENTS.billingWebhookStuck,
		severity: "error",
		message: "Billing webhooks need attention",
		context: args,
		timestamp: Date.now(),
	});
}

export function emitEmailOutboxStuckAlert(args: {
	count: number;
	oldestAgeMin: number;
}): Promise<void> {
	if (!env.TG_ANALYTICS) {
		return Promise.resolve();
	}
	return getRuntime().emit({
		name: PLATFORM_ALERT_EVENTS.emailOutboxStuck,
		severity: "error",
		message: "Outbound email is stuck",
		context: args,
		timestamp: Date.now(),
	});
}

export function emitBillingSubscriptionProblemPing(args: {
	eventType: string;
	organizationId: string | null;
	subscriptionId: string | null;
	customerEmail: string | null;
}): Promise<void> {
	return emitPlatformInfoEvent({
		name: PLATFORM_ALERT_EVENTS.billingSubscriptionProblem,
		message:
			args.eventType === "subscription.on_hold"
				? "Subscription placed on hold"
				: "Subscription payment failed",
		context: args,
	});
}

export function emitEmailDisabledWarning(): Promise<void> {
	return emitPlatformInfoEvent({
		name: PLATFORM_ALERT_EVENTS.serverEmailDisabled,
		message: "Product email delivery is disabled",
		context: {
			deployment: env.DEPLOYMENT,
			resendEnabled: env.RESEND_ENABLED,
			sesEnabled: env.SES_ENABLED,
		},
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
		windowMs: PLATFORM_ALERT_DEDUPE_MS,
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
