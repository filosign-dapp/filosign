import { beforeEach, describe, expect, test } from "bun:test";
import { getAddress } from "viem";
import { testEnvStub } from "../support/env-stub";
import {
	resendSend,
	resetEmailDeliveryClients,
	resetEmailTestEnv,
	resetEmailTransportMocks,
	sesSend,
	setEmailTestEnv,
} from "../support/mock-email";

describe("email delivery", () => {
	beforeEach(async () => {
		resetEmailTransportMocks();
		resetEmailTestEnv();
		process.env.ASTRO_URL = testEnvStub.ASTRO_URL;
		await resetEmailDeliveryClients();
	});

	describe("validateEmailEnv", () => {
		test("allows both providers disabled without credentials", async () => {
			const { validateEmailEnv } = await import(
				"@/lib/platform/validate-email-env"
			);
			expect(() =>
				validateEmailEnv({
					EMAIL_PROVIDER: "ses",
					RESEND_ENABLED: false,
					SES_ENABLED: false,
				}),
			).not.toThrow();
		});

		test("requires SES when EMAIL_PROVIDER is ses and SES_ENABLED", async () => {
			const { validateEmailEnv } = await import(
				"@/lib/platform/validate-email-env"
			);
			expect(() =>
				validateEmailEnv({
					EMAIL_PROVIDER: "ses",
					RESEND_ENABLED: false,
					SES_ENABLED: true,
				}),
			).toThrow(/SES_REGION/);
		});
	});

	describe("deliverOutboundEmail", () => {
		test("sends via SES when EMAIL_PROVIDER is ses", async () => {
			setEmailTestEnv({
				EMAIL_PROVIDER: "ses",
				SES_ENABLED: true,
				SES_REGION: "eu-central-1",
				SES_FROM_EMAIL: "hello@filosign.xyz",
				SES_FROM_NAME: "Filosign",
				RESEND_ENABLED: false,
			});
			await resetEmailDeliveryClients();

			const { deliverOutboundEmail } = await import(
				"@/lib/platform/email/email"
			);

			const result = await deliverOutboundEmail({
				from: "",
				to: "user@example.com",
				subject: "Test",
				html: "<p>Hi</p>",
				text: "Hi",
				idempotencyKey: "key-1",
			});

			expect(result).toEqual({ provider: "ses", id: "ses_test" });
			expect(sesSend).toHaveBeenCalledTimes(1);
			expect(resendSend).not.toHaveBeenCalled();
		});

		test("falls back to Resend on retryable SES failure", async () => {
			sesSend.mockImplementation(async () => {
				const err = new Error("ServiceUnavailableException");
				Object.assign(err, { name: "ServiceUnavailableException" });
				throw err;
			});

			setEmailTestEnv({
				EMAIL_PROVIDER: "ses",
				SES_ENABLED: true,
				SES_REGION: "eu-central-1",
				SES_FROM_EMAIL: "hello@filosign.xyz",
				RESEND_ENABLED: true,
				RESEND_API_KEY: "re_test",
				RESEND_FROM_EMAIL: "test@example.com",
			});
			await resetEmailDeliveryClients();

			const { deliverOutboundEmail } = await import(
				"@/lib/platform/email/email"
			);

			const result = await deliverOutboundEmail({
				from: "Filosign <hello@filosign.xyz>",
				to: "user@example.com",
				subject: "Test",
				html: "<p>Hi</p>",
				text: "Hi",
				idempotencyKey: "key-2",
			});

			expect(result).toEqual({ provider: "resend", id: "re_test" });
			expect(sesSend).toHaveBeenCalledTimes(1);
			expect(resendSend).toHaveBeenCalledTimes(1);
		});

		test("sends via Resend when EMAIL_PROVIDER is resend", async () => {
			setEmailTestEnv({
				EMAIL_PROVIDER: "resend",
				RESEND_ENABLED: true,
				RESEND_API_KEY: "re_test",
				RESEND_FROM_EMAIL: "test@example.com",
				SES_ENABLED: false,
			});
			await resetEmailDeliveryClients();

			const { deliverOutboundEmail } = await import(
				"@/lib/platform/email/email"
			);

			const result = await deliverOutboundEmail({
				from: "",
				to: "user@example.com",
				subject: "Test",
				html: "<p>Hi</p>",
				text: "Hi",
				idempotencyKey: "key-3",
			});

			expect(result).toEqual({ provider: "resend", id: "re_test" });
			expect(resendSend).toHaveBeenCalledTimes(1);
		});
	});

	describe("isRetryableSesFailure", () => {
		test("treats throttling as retryable", async () => {
			const { isRetryableSesFailure } = await import(
				"@/lib/platform/email/email"
			);
			const err = new Error("Rate exceeded");
			Object.assign(err, { $metadata: { httpStatusCode: 429 } });
			expect(isRetryableSesFailure(err)).toBe(true);
		});

		test("does not retry validation failures", async () => {
			const { isRetryableSesFailure } = await import(
				"@/lib/platform/email/email"
			);
			const err = new Error("Bad request");
			Object.assign(err, { $metadata: { httpStatusCode: 400 } });
			expect(isRetryableSesFailure(err)).toBe(false);
		});
	});

	describe("sendPartnerInviteEmail", () => {
		test("returns false when outbound email is disabled", async () => {
			setEmailTestEnv({
				EMAIL_PROVIDER: "ses",
				RESEND_ENABLED: false,
				SES_ENABLED: false,
			});

			const { sendPartnerInviteEmail } = await import(
				"@/lib/platform/email/invites"
			);

			const sent = await sendPartnerInviteEmail({
				to: "partner@acme.com",
				inviteUrl: "https://app.example.com/?platformInvite=abc",
				planLabel: "Teams Pro",
				trialDays: 30,
				recipientName: "Jordan Lee",
			});

			expect(sent).toBe(false);
			expect(resendSend).not.toHaveBeenCalled();
		});

		test("warm variant uses default subject and from address", async () => {
			const { sendPartnerInviteEmail } = await import(
				"@/lib/platform/email/invites"
			);

			await sendPartnerInviteEmail({
				to: "partner@acme.com",
				inviteUrl: "https://app.example.com/?platformInvite=abc",
				planLabel: "Teams Pro",
				trialDays: 30,
				recipientName: "Jordan Lee",
				emailVariant: "warm",
			});

			expect(resendSend).toHaveBeenCalledWith(
				expect.objectContaining({
					from: "Filosign <test@example.com>",
					subject: "Your filosign pilot is here.",
					to: "partner@acme.com",
				}),
				expect.any(Object),
			);
		});

		test("cold variant uses cold subject line", async () => {
			const { sendPartnerInviteEmail } = await import(
				"@/lib/platform/email/invites"
			);

			await sendPartnerInviteEmail({
				to: "partner@acme.com",
				inviteUrl: "https://app.example.com/?platformInvite=abc",
				planLabel: "Teams Pro",
				trialDays: 30,
				recipientName: "Jordan Lee",
				emailVariant: "cold",
			});

			expect(resendSend).toHaveBeenCalledWith(
				expect.objectContaining({
					subject: "You're invited to try filosign",
				}),
				expect.any(Object),
			);
		});

		test("custom variant includes custom body in rendered html", async () => {
			const { sendPartnerInviteEmail } = await import(
				"@/lib/platform/email/invites"
			);

			await sendPartnerInviteEmail({
				to: "partner@acme.com",
				inviteUrl: "https://app.example.com/?platformInvite=abc",
				planLabel: "Teams Pro",
				trialDays: 30,
				recipientName: "Jordan Lee",
				emailVariant: "custom",
				customBody: "Looking forward to mapping your first workflow together.",
			});

			expect(resendSend).toHaveBeenCalledWith(
				expect.objectContaining({
					html: expect.stringContaining(
						"Looking forward to mapping your first workflow together.",
					),
				}),
				expect.any(Object),
			);
		});
	});

	describe("document invite emails", () => {
		test("rotated cold invite uses updated access link subject", async () => {
			const { sendColdDocumentInviteEmail } = await import(
				"@/lib/platform/email/invites"
			);

			await sendColdDocumentInviteEmail({
				to: "cold@example.com",
				senderWallet: getAddress("0x1111111111111111111111111111111111111111"),
				pieceCid: "bafyROTATE",
				inviteToken: "new-token-abcdefghijklmnop",
				senderName: "Alex Chen",
				documentTitle: "Vendor Agreement",
				intent: "rotated",
			});

			expect(resendSend).toHaveBeenCalledWith(
				expect.objectContaining({
					subject: "Updated access link from Alex Chen",
				}),
				expect.any(Object),
			);
		});

		test("signer turn email uses sender-ready subject", async () => {
			const { sendSignerTurnEmail } = await import(
				"@/lib/platform/email/invites"
			);

			await sendSignerTurnEmail({
				to: "signer@example.com",
				senderWallet: getAddress("0x1111111111111111111111111111111111111111"),
				pieceCid: "bafyTURN",
				senderName: "Alex Chen",
				documentTitle: "Vendor Agreement",
				variant: "warm",
			});

			expect(resendSend).toHaveBeenCalledWith(
				expect.objectContaining({
					subject: "Alex Chen is ready for your signature",
				}),
				expect.any(Object),
			);
		});
	});
});
