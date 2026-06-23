import { describe, expect, test } from "bun:test";
import { formatTelegramMessage } from "../../src/transports/telegram-format";

describe("formatTelegramMessage", () => {
	test("formats server started as readable HTML", () => {
		const text = formatTelegramMessage({
			name: "server.started",
			severity: "info",
			message: "Filosign server started",
			context: {
				deployment: "production",
				chain: "mainnet",
				serverRole: "api",
				hostname: "filosign-api-1",
			},
			timestamp: Date.UTC(2026, 5, 14, 12, 30),
		});

		expect(text).toContain("<b>Server started</b>");
		expect(text).toContain("Filosign server started");
		expect(text).toContain("Deployment: production");
		expect(text).toContain("Chain: mainnet");
		expect(text).toContain("Role: api");
		expect(text).toContain("Host: filosign-api-1");
		expect(text).not.toContain("server.started");
		expect(text).not.toContain("{");
	});

	test("formats user feedback with notes block", () => {
		const text = formatTelegramMessage({
			name: "product.feedback_submitted",
			severity: "info",
			message: "New user feedback",
			context: {
				wallet: "0x1111111111111111111111111111111111111111",
				featureArea: "send",
				promptType: "contextual",
				message: "Smooth send flow",
				route: "/dashboard/envelope/create/add-sign",
				trigger: "first_envelope_sent",
			},
			timestamp: Date.UTC(2026, 5, 14, 12, 30),
		});

		expect(text).toContain("<b>User feedback</b>");
		expect(text).not.toContain("Rating:");
		expect(text).toContain("Area: send");
		expect(text).toContain("Prompt: contextual");
		expect(text).toContain("Wallet: 0x1111…1111");
		expect(text).toContain("Notes:");
		expect(text).toContain("Smooth send flow");
		expect(text).not.toContain('"wallet"');
	});

	test("formats bug reports", () => {
		const text = formatTelegramMessage({
			name: "product.feedback_submitted",
			severity: "info",
			message: "New bug report",
			context: {
				kind: "bug",
				wallet: "0x1111111111111111111111111111111111111111",
				featureArea: "sign",
				promptType: "global",
				message: "Button does nothing after upload",
				route: "/dashboard/document/sign",
			},
			timestamp: Date.UTC(2026, 5, 14, 12, 30),
		});

		expect(text).toContain("<b>Bug report</b>");
		expect(text).toContain("Type: Bug report");
		expect(text).not.toContain("Rating:");
		expect(text).toContain("Button does nothing after upload");
	});

	test("formats support requests", () => {
		const text = formatTelegramMessage({
			name: "product.feedback_submitted",
			severity: "info",
			message: "New support request",
			context: {
				kind: "support",
				wallet: "0x1111111111111111111111111111111111111111",
				featureArea: "workspace",
				promptType: "global",
				message: "Cannot invite a teammate to my workspace",
				route: "/dashboard/settings/workspace",
			},
			timestamp: Date.UTC(2026, 5, 14, 12, 30),
		});

		expect(text).toContain("<b>Support request</b>");
		expect(text).toContain("Type: Support ticket");
		expect(text).not.toContain("Rating:");
		expect(text).toContain("Cannot invite a teammate to my workspace");
	});

	test("formats critical HTTP alerts with severity prefix", () => {
		const text = formatTelegramMessage({
			name: "server.http_500",
			severity: "critical",
			message: "HTTP request returned 5xx",
			context: {
				method: "POST",
				path: "/api/rpc",
				status: 500,
				durationMs: 42,
			},
			timestamp: Date.UTC(2026, 5, 14, 12, 30),
		});

		expect(text).toContain("<b>CRITICAL · HTTP 500</b>");
		expect(text).toContain("Request: POST /api/rpc");
		expect(text).toContain("Status: 500");
		expect(text).toContain("Duration: 42 ms");
	});

	test("escapes HTML in user-provided content", () => {
		const text = formatTelegramMessage({
			name: "product.feedback_submitted",
			severity: "info",
			message: "New user feedback",
			context: {
				message: "<script>alert(1)</script>",
			},
			timestamp: Date.UTC(2026, 5, 14, 12, 30),
		});

		expect(text).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
		expect(text).not.toContain("<script>");
	});

	test("falls back to generic formatting for unknown events", () => {
		const text = formatTelegramMessage({
			name: "custom.event",
			severity: "error",
			message: "Something happened",
			context: { detail: "value" },
			timestamp: Date.UTC(2026, 5, 14, 12, 30),
		});

		expect(text).toContain("<b>ERROR · custom · event</b>");
		expect(text).toContain("Detail: value");
	});

	test("formats relayer gas low balance in ETH instead of wei", () => {
		const text = formatTelegramMessage({
			name: "server.relayer_gas_low",
			severity: "critical",
			message: "Relayer pool member native balance below threshold",
			context: {
				wallet: "0x1111111111111111111111111111111111111111",
				balanceWei: "10000000000000000",
				thresholdWei: "20000000000000000",
				deployment: "production",
				chain: "mainnet",
			},
			timestamp: Date.UTC(2026, 5, 14, 12, 30),
		});

		expect(text).toContain("Balance: 0.01 ETH");
		expect(text).toContain("Threshold: 0.02 ETH");
		expect(text).not.toContain("wei");
	});

	test("formats FOC FIL balance low in FIL instead of wei", () => {
		const text = formatTelegramMessage({
			name: "server.foc_fil_low",
			severity: "critical",
			message: "FOC wallet FIL balance below threshold",
			context: {
				wallet: "0x1111111111111111111111111111111111111111",
				balanceWei: "1",
				thresholdWei: "50000000000000000",
				deployment: "production",
				chain: "mainnet",
				token: "FIL",
			},
			timestamp: Date.UTC(2026, 5, 14, 12, 30),
		});

		expect(text).toContain("Balance: 0.000000000000000001 FIL");
		expect(text).toContain("Threshold: 0.05 FIL");
		expect(text).not.toContain("wei");
	});

	test("formats FOC USDFC balance low in USDFC instead of wei", () => {
		const text = formatTelegramMessage({
			name: "server.foc_usdfc_low",
			severity: "critical",
			message: "FOC wallet USDFC balance below threshold",
			context: {
				wallet: "0x1111111111111111111111111111111111111111",
				balanceWei: "1",
				thresholdWei: "5000000000000000000",
				deployment: "production",
				chain: "mainnet",
				token: "USDFC",
			},
			timestamp: Date.UTC(2026, 5, 14, 12, 30),
		});

		expect(text).toContain("Balance: 0.000000000000000001 USDFC");
		expect(text).toContain("Threshold: 5 USDFC");
		expect(text).not.toContain("wei");
	});

	test("falls back to raw wei string when balance value is invalid", () => {
		const text = formatTelegramMessage({
			name: "server.relayer_gas_low",
			severity: "critical",
			message: "Relayer pool member native balance below threshold",
			context: {
				wallet: "0x1111111111111111111111111111111111111111",
				balanceWei: "not-a-number",
				thresholdWei: "20000000000000000",
				deployment: "production",
				chain: "mainnet",
			},
			timestamp: Date.UTC(2026, 5, 14, 12, 30),
		});

		expect(text).toContain("Balance: not-a-number ETH");
		expect(text).toContain("Threshold: 0.02 ETH");
	});
});
