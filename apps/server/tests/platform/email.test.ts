import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type { OutboundEmail } from "@/lib/platform/email";

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
const sesCalls: unknown[] = [];

// Mock env with dynamic getters
mock.module("@/env", () => ({
	default: {
		get RESEND_FROM_EMAIL() {
			return "noreply@example.com";
		},
		get RESEND_API_KEY() {
			return "re_test";
		},
		get SES_ENABLED() {
			return sesConfigured;
		},
		get SES_REGION() {
			return "us-east-1";
		},
		get SES_FROM_EMAIL() {
			return "noreply@example.com";
		},
	},
}));

// Mock Resend library
const mockSend = mock(async (payload: unknown, options: unknown) => {
	const p = payload as OutboundEmail;
	const opts = options as { headers?: Record<string, string> };
	resendCalls.push({
		...p,
		idempotencyKey: opts?.headers?.["Idempotency-Key"] ?? "",
	});
	if (resendShouldFail) {
		const err = new Error(
			resendFailRetryable ? "429 rate limit exceeded" : "invalid email",
		) as Error & { statusCode?: number };
		if (resendStatusCode !== undefined) {
			err.statusCode = resendStatusCode;
		}
		return { data: null, error: err };
	}
	return { data: { id: "resend-msg-1" }, error: null };
});

mock.module("resend", () => {
	return {
		Resend: class {
			emails = {
				send: mockSend,
			};
		},
	};
});

// Mock AWS SES library
const mockSesSend = mock(async (command: { input: unknown }) => {
	sesCalls.push(command.input);
	return { MessageId: "ses-msg-1" };
});

mock.module("@aws-sdk/client-sesv2", () => {
	return {
		SESv2Client: class {
			send = mockSesSend;
		},
		SendEmailCommand: class {
			constructor(public input: unknown) {}
		},
	};
});

afterAll(() => {
	mock.restore();
});

describe("deliverOutboundEmail", () => {
	beforeEach(async () => {
		resendCalls.length = 0;
		sesCalls.length = 0;
		resendShouldFail = false;
		resendFailRetryable = true;
		resendStatusCode = 429;
		sesConfigured = true;
		mockSend.mockClear();
		mockSesSend.mockClear();

		const { resetResendClientForTests, resetSesClientForTests } = await import(
			"@/lib/platform/email"
		);
		resetResendClientForTests();
		resetSesClientForTests();
	});

	test("uses Resend on success", async () => {
		const { deliverOutboundEmail } = await import("@/lib/platform/email");
		const result = await deliverOutboundEmail(sampleMessage);
		expect(result).toEqual({ provider: "resend", id: "resend-msg-1" });
		expect(resendCalls).toHaveLength(1);
		expect(sesCalls).toHaveLength(0);
	});

	test("falls back to SES on retryable Resend failure", async () => {
		resendShouldFail = true;
		const { deliverOutboundEmail } = await import("@/lib/platform/email");
		const result = await deliverOutboundEmail(sampleMessage);
		expect(result).toEqual({ provider: "ses", id: "ses-msg-1" });
		expect(resendCalls).toHaveLength(1);
		expect(sesCalls).toHaveLength(1);
	});

	test("does not fall back on non-retryable Resend failure", async () => {
		resendShouldFail = true;
		resendFailRetryable = false;
		resendStatusCode = 400;
		const { deliverOutboundEmail } = await import("@/lib/platform/email");
		await expect(deliverOutboundEmail(sampleMessage)).rejects.toThrow(
			/invalid email/,
		);
		expect(sesCalls).toHaveLength(0);
	});

	test("propagates Resend error when SES not configured", async () => {
		resendShouldFail = true;
		sesConfigured = false;
		const { deliverOutboundEmail } = await import("@/lib/platform/email");
		await expect(deliverOutboundEmail(sampleMessage)).rejects.toThrow(
			/429 rate limit/,
		);
		expect(sesCalls).toHaveLength(0);
	});
});

describe("isRetryableResendFailure", () => {
	test("classifies status codes and messages", async () => {
		const { isRetryableResendFailure } = await import("@/lib/platform/email");
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
