import os from "node:os";
import type { LoggerEvent, LoggerTransport } from "../types";

export type TelegramTransportOptions = {
	botToken: string;
	chatId: string;
	enabled: boolean;
};

/** Minimal fetch surface used by the Telegram transport (testable without mocking globals). */
export type TelegramFetch = (
	input: RequestInfo | URL,
	init?: RequestInit,
) => Promise<Response>;

export type TelegramTransportDeps = {
	fetch?: TelegramFetch;
};

function toTelegramText(event: LoggerEvent): string {
	const stamp = new Date(event.timestamp ?? Date.now()).toISOString();
	const meta = `${os.hostname()}:${process.pid}`;
	const payload = event.context ? JSON.stringify(event.context) : "{}";
	return [
		`[${event.severity.toUpperCase()}] ${event.name}`,
		event.message,
		`at=${stamp} source=${meta}`,
		payload,
	].join("\n");
}

export function createTelegramTransport(
	options: TelegramTransportOptions,
	deps: TelegramTransportDeps = {},
): LoggerTransport {
	const fetchFn = deps.fetch ?? globalThis.fetch;

	return {
		async send(event) {
			if (!options.enabled) return;
			await fetchFn(
				`https://api.telegram.org/bot${options.botToken}/sendMessage`,
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						chat_id: options.chatId,
						text: toTelegramText(event),
						disable_web_page_preview: true,
					}),
				},
			);
		},
	};
}
