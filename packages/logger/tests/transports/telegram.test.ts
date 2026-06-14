import { describe, expect, test } from "bun:test";
import {
	createTelegramTransport,
	normalizeTelegramChatId,
	type TelegramFetch,
} from "../../src/transports/telegram";
import type { LoggerEvent } from "../../src/types";

const sampleEvent: LoggerEvent = {
	name: "server.http_500",
	severity: "critical",
	message: "HTTP request returned 5xx",
	context: { method: "POST", path: "/api/rpc", status: 500 },
	timestamp: 1_700_000_000_000,
};

function createRecordingFetch(): {
	fetch: TelegramFetch;
	calls: { url: string; init?: RequestInit }[];
} {
	const calls: { url: string; init?: RequestInit }[] = [];
	const fetch: TelegramFetch = async (input, init) => {
		const url = typeof input === "string" ? input : input.toString();
		calls.push({ url, init });
		return new Response(JSON.stringify({ ok: true }), { status: 200 });
	};
	return { fetch, calls };
}

describe("normalizeTelegramChatId", () => {
	test("prefixes bare supergroup ids with a leading minus", () => {
		expect(normalizeTelegramChatId("1003999299780")).toBe("-1003999299780");
	});

	test("leaves already-normalized ids unchanged", () => {
		expect(normalizeTelegramChatId("-1003999299780")).toBe("-1003999299780");
	});

	test("leaves user dm ids unchanged", () => {
		expect(normalizeTelegramChatId("123456789")).toBe("123456789");
	});
});

describe("createTelegramTransport", () => {
	test("does not call fetch when disabled", async () => {
		const { fetch, calls } = createRecordingFetch();
		const transport = createTelegramTransport(
			{
				enabled: false,
				botToken: "bot123",
				chatId: "group456",
			},
			{ fetch },
		);
		await transport.send(sampleEvent);
		expect(calls).toHaveLength(0);
	});

	test("posts to Telegram API when enabled", async () => {
		const { fetch, calls } = createRecordingFetch();
		const transport = createTelegramTransport(
			{
				enabled: true,
				botToken: "bot123",
				chatId: "group456",
			},
			{ fetch },
		);
		await transport.send(sampleEvent);
		expect(calls).toHaveLength(1);
		expect(calls[0]?.url).toBe(
			"https://api.telegram.org/botbot123/sendMessage",
		);
		const body = JSON.parse(String(calls[0]?.init?.body)) as {
			chat_id: string;
			text: string;
			parse_mode: string;
			disable_web_page_preview: boolean;
		};
		expect(body.chat_id).toBe("group456");
		expect(body.parse_mode).toBe("HTML");
		expect(body.disable_web_page_preview).toBe(true);
		expect(body.text).toContain("<b>CRITICAL · HTTP 500</b>");
		expect(body.text).toContain("HTTP request returned 5xx");
		expect(body.text).toContain("Request: POST /api/rpc");
	});

	test("normalizes bare supergroup chat ids before send", async () => {
		const { fetch, calls } = createRecordingFetch();
		const transport = createTelegramTransport(
			{
				enabled: true,
				botToken: "bot123",
				chatId: "1003999299780",
			},
			{ fetch },
		);
		await transport.send(sampleEvent);
		const body = JSON.parse(String(calls[0]?.init?.body)) as {
			chat_id: string;
		};
		expect(body.chat_id).toBe("-1003999299780");
	});
});
