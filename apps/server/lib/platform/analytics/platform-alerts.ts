import {
	createInMemoryDedupe,
	createLoggerRuntime,
	createTelegramTransport,
	type TelegramTransportOptions,
} from "@filosign/logger";
import env from "@/env";
import { mirrorPlatformAlertToPostHog } from "@/lib/platform/analytics/platform-alert-posthog";
import type { PlatformAlertEvent } from "./events";

export { emitCriticalPlatformEventFromProcessEnv } from "./platform-alerts-env";
export {
	mirrorPlatformAlertToPostHog,
	mirrorPlatformAlertToPostHogFromProcessEnv,
	platformAlertPostHogProperties,
	resetPlatformAlertPostHogDedupeForTests,
} from "./platform-alert-posthog";

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

/** Test-only: reset singleton runtime between cases. */
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

/** Critical platform alerts (Telegram), gated by `TG_ANALYTICS`. */
export function emitCriticalPlatformEvent(
	event: PlatformAlertEvent,
): Promise<void> {
	mirrorPlatformAlertToPostHog(event);
	return getRuntime().emit({
		...event,
		timestamp: Date.now(),
	});
}
