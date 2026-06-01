import { describe, expect, test } from "bun:test";
import {
	scrubAnalyticsProperties,
	scrubAnalyticsString,
} from "../analytics-scrub";

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
});
