import { mock } from "bun:test";
import type {
	LoggerEvent,
	LoggerTransport,
	TelegramTransportOptions,
} from "@filosign/logger";
import * as logger from "@filosign/logger";

/** Captured platform alert events from mocked {@link createTelegramTransport}. */
export const capturedTelegramEvents: LoggerEvent[] = [];

function captureTelegramTransport(
	options: TelegramTransportOptions,
): LoggerTransport {
	return {
		send(event) {
			if (!options.enabled) return;
			capturedTelegramEvents.push(event);
		},
	};
}

export function mockLoggerTelegramCapture(): void {
	mock.module("@filosign/logger", () => ({
		...logger,
		createTelegramTransport: captureTelegramTransport,
	}));
}

export function clearCapturedTelegramEvents(): void {
	capturedTelegramEvents.length = 0;
}

/** Await microtasks after fire-and-forget `void emitCriticalPlatformEvent(...)`. */
export async function flushPlatformAlerts(): Promise<void> {
	await Promise.resolve();
}
