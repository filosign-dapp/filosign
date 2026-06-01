import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { OutboundEmail } from "@/lib/platform/email/types";

const sampleMessage: OutboundEmail = {
	from: "noreply@example.com",
	to: "user@example.com",
	subject: "Test",
	text: "Hello",
	html: "<p>Hello</p>",
	replyTo: "noreply@example.com",
	idempotencyKey: "test-key",
};

let resendShouldFail = false;
let resendFailRetryable = true;
let resendStatusCode: number | undefined = 429;
let sesConfigured = true;
const resendCalls: OutboundEmail[] = [];
const sesCalls: OutboundEmail[] = [];

mock.module("@/env", () => ({
	default: {
		RESEND_FROM_EMAIL: "noreply@example.com",
		RESEND_API_KEY: "re_test",
	},
}));

mock.module("@/lib/platform/email/resend-transport", () => ({
	sendViaResend: async (msg: OutboundEmail) => {
		resendCalls.push(msg);
		if (resendShouldFail) {
			const err = new Error(
				resendFailRetryable ? "429 rate limit exceeded" : "invalid email",
			);
			if (resendStatusCode !== undefined) {
				Object.assign(err, { statusCode: resendStatusCode });
			}
			throw err;
		}
		return { id: "resend-msg-1" };
	},
	resetResendClientForTests: () => {},
}));

mock.module("@/lib/platform/email/ses-transport", () => ({
	sendViaSes: async (msg: OutboundEmail) => {
		sesCalls.push(msg);
		return { id: "ses-msg-1" };
	},
	resetSesClientForTests: () => {},
}));

mock.module("@/lib/platform/email/ses-config", () => ({
	isSesDeliveryConfigured: () => sesConfigured,
	warnIfSesMisconfigured: () => {},
}));

describe("deliverOutboundEmail", () => {
	beforeEach(() => {
		resendCalls.length = 0;
		sesCalls.length = 0;
		resendShouldFail = false;
		resendFailRetryable = true;
		resendStatusCode = 429;
		sesConfigured = true;
	});

	test("uses Resend on success", async () => {
		const { deliverOutboundEmail } = await import(
			"@/lib/platform/email/deliver"
		);
		const result = await deliverOutboundEmail(sampleMessage);
		expect(result).toEqual({ provider: "resend", id: "resend-msg-1" });
		expect(resendCalls).toHaveLength(1);
		expect(sesCalls).toHaveLength(0);
	});

	test("falls back to SES on retryable Resend failure", async () => {
		resendShouldFail = true;
		const { deliverOutboundEmail } = await import(
			"@/lib/platform/email/deliver"
		);
		const result = await deliverOutboundEmail(sampleMessage);
		expect(result).toEqual({ provider: "ses", id: "ses-msg-1" });
		expect(resendCalls).toHaveLength(1);
		expect(sesCalls).toHaveLength(1);
	});

	test("does not fall back on non-retryable Resend failure", async () => {
		resendShouldFail = true;
		resendFailRetryable = false;
		resendStatusCode = 400;
		const { deliverOutboundEmail } = await import(
			"@/lib/platform/email/deliver"
		);
		await expect(deliverOutboundEmail(sampleMessage)).rejects.toThrow(
			/invalid email/,
		);
		expect(sesCalls).toHaveLength(0);
	});

	test("propagates Resend error when SES not configured", async () => {
		resendShouldFail = true;
		sesConfigured = false;
		const { deliverOutboundEmail } = await import(
			"@/lib/platform/email/deliver"
		);
		await expect(deliverOutboundEmail(sampleMessage)).rejects.toThrow(
			/429 rate limit/,
		);
		expect(sesCalls).toHaveLength(0);
	});
});

describe("isRetryableResendFailure", () => {
	test("classifies status codes and messages", async () => {
		const { isRetryableResendFailure } = await import(
			"@/lib/platform/email/resend-errors"
		);
		expect(
			isRetryableResendFailure({ statusCode: 429, message: "Too Many" }),
		).toBe(true);
		expect(isRetryableResendFailure({ statusCode: 503 })).toBe(true);
		expect(isRetryableResendFailure({ statusCode: 400, message: "bad" })).toBe(
			false,
		);
		expect(isRetryableResendFailure(new Error("fetch failed"))).toBe(true);
	});
});
