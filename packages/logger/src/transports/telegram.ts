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

/** Supergroup IDs are `-100…`; some tools omit the leading minus. */
export function normalizeTelegramChatId(chatId: string): string {
	const trimmed = chatId.trim();
	if (trimmed.startsWith("-")) {
		return trimmed;
	}
	if (/^100\d+$/.test(trimmed)) {
		return `-${trimmed}`;
	}
	return trimmed;
}

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
			const response = await fetchFn(
				`https://api.telegram.org/bot${options.botToken}/sendMessage`,
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						chat_id: normalizeTelegramChatId(options.chatId),
						text: toTelegramText(event),
						disable_web_page_preview: true,
					}),
				},
			);
			if (!response.ok) {
				const body = await response.text().catch(() => "");
				console.error(
					"[telegram] sendMessage failed:",
					response.status,
					body || response.statusText,
				);
			}
		},
	};
}
