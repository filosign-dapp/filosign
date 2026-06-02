import { describe, expect, test } from "bun:test";
import {
	scrubAnalyticsProperties,
	scrubAnalyticsString,
	scrubCaptureEvent,
} from "..";

describe("scrubAnalyticsString", () => {
	test("redacts emails", () => {
		expect(scrubAnalyticsString("user@example.com")).toBe("[email redacted]");
	});

	test("redacts 64-char hex", () => {
		expect(
			scrubAnalyticsString(
				"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
			),
		).toBe("[hex redacted]");
	});

	test("redacts embedded emails in longer strings", () => {
		expect(
			scrubAnalyticsString("sender=user@example.com action=invite_created"),
		).toBe("sender=[email redacted] action=invite_created");
	});
});

describe("scrubAnalyticsProperties", () => {
	test("redacts sensitive keys", () => {
		expect(
			scrubAnalyticsProperties({
				passphrase: "secret phrase",
				source: "ErrorBoundary",
			}),
		).toEqual({
			passphrase: "[redacted]",
			source: "ErrorBoundary",
		});
	});

	test("redacts keys containing sensitive substrings", () => {
		expect(
			scrubAnalyticsProperties({
				sessionToken: "abc",
				auth_header: "bearer xyz",
				normalKey: "ok",
			}),
		).toEqual({
			sessionToken: "[redacted]",
			auth_header: "[redacted]",
			normalKey: "ok",
		});
	});

	test("scrubCaptureEvent preserves event shell", () => {
		const input = {
			uuid: "id-1",
			event: "$exception",
			properties: { source: "user@example.com" },
		};
		const out = scrubCaptureEvent(input);
		expect(out?.properties?.source).toBe("[email redacted]");
	});
});
