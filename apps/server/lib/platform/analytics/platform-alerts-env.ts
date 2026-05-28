import {
	createInMemoryDedupe,
	createLoggerRuntime,
	createTelegramTransport,
	type TelegramTransportOptions,
} from "@filosign/logger";
import type { PlatformAlertEvent } from "./events";

function readTelegramConfigFromProcessEnv(): TelegramTransportOptions {
	return {
		enabled: process.env.TG_ANALYTICS === "true",
		botToken: process.env.TG_ANALYTICS_BOT_TOKEN ?? "",
		chatId: process.env.TG_ANALYTICS_BOT_GROUP_ID ?? "",
	};
}

/**
 * Critical platform alerts using `process.env` only (no `@/env` import).
 * For bootstrap failures before env validation succeeds.
 */
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
	return runtime.emit({
		...event,
		timestamp: Date.now(),
	});
}
