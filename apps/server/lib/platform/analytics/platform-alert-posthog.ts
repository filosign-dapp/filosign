import { createInMemoryDedupe, type LoggerEvent } from "@filosign/logger";
import {
	type AnalyticsProperties,
	scrubAnalyticsProperties,
} from "@filosign/shared";
import {
	PLATFORM_ALERT_POSTHOG_EVENT,
	type PlatformAlertEvent,
} from "@/lib/platform/analytics/events";
import { captureEvent } from "@/lib/platform/analytics/posthog";

const PLATFORM_ALERT_DEDUPE_MS = 5 * 60 * 1000;
const SERVICE_DISTINCT_ID = "service:filosign-server";

let dedupe = createInMemoryDedupe({ windowMs: PLATFORM_ALERT_DEDUPE_MS });

/** Test-only: reset dedupe window between cases. */
export function resetPlatformAlertPostHogDedupeForTests(): void {
	dedupe = createInMemoryDedupe({ windowMs: PLATFORM_ALERT_DEDUPE_MS });
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

/** Sanitized PostHog properties for a platform alert (ops mirror). */
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
		process.env.POSTHOG_ENABLED === "true" &&
		Boolean(process.env.POSTHOG_HOST?.trim()) &&
		Boolean(process.env.POSTHOG_API_KEY?.trim())
	);
}

/**
 * Mirror a critical platform alert to PostHog (`platform_alert` event).
 * Uses the same dedupe key window as Telegram (5 minutes). No-op when disabled
 * or PostHog is not configured (e.g. env validation bootstrap).
 */
export function mirrorPlatformAlertToPostHog(
	event: PlatformAlertEvent,
	enabled: boolean = postHogMirrorEnabledFromProcessEnv(),
): void {
	if (!enabled) return;
	if (!dedupe.shouldSend(toLoggerEvent(event))) return;

	try {
		captureEvent({
			distinctId: SERVICE_DISTINCT_ID,
			event: PLATFORM_ALERT_POSTHOG_EVENT,
			properties: platformAlertPostHogProperties(event),
		});
	} catch {
		// POSTHOG_HOST / runtime unavailable (bootstrap before env load)
	}
}

/** Mirror using `process.env` only — for `emitCriticalPlatformEventFromProcessEnv`. */
export function mirrorPlatformAlertToPostHogFromProcessEnv(
	event: PlatformAlertEvent,
): void {
	mirrorPlatformAlertToPostHog(event, postHogMirrorEnabledFromProcessEnv());
}
