import { beforeEach, describe, expect, mock, test } from "bun:test";
import { testEnvStub } from "../support/env-stub";

const deliverOutboundEmail = mock(async () => ({
	provider: "resend" as const,
	id: "msg_1",
}));

mock.module("@/env", () => ({
	default: { ...testEnvStub },
}));

mock.module("@/lib/platform/email/email", () => ({
	deliverOutboundEmail,
}));

beforeEach(() => {
	deliverOutboundEmail.mockClear();
	process.env.ASTRO_URL = testEnvStub.ASTRO_URL;
	mock.module("@/env", () => ({
		default: { ...testEnvStub, RESEND_ENABLED: true },
	}));
});

describe("sendPartnerInviteEmail", () => {
	test("returns false when outbound email is disabled", async () => {
		mock.module("@/env", () => ({
			default: { ...testEnvStub },
		}));

		const { sendPartnerInviteEmail: sendDisabled } = await import(
			"@/lib/platform/email/invites"
		);

		const sent = await sendDisabled({
			to: "partner@acme.com",
			inviteUrl: "https://app.example.com/?platformInvite=abc",
			planLabel: "Teams Pro",
			trialDays: 30,
			recipientName: "Jordan Lee",
		});

		expect(sent).toBe(false);
		expect(deliverOutboundEmail).not.toHaveBeenCalled();
	});

	test("warm variant uses default subject and from address", async () => {
		const { sendPartnerInviteEmail: sendEnabled } = await import(
			"@/lib/platform/email/invites"
		);

		await sendEnabled({
			to: "partner@acme.com",
			inviteUrl: "https://app.example.com/?platformInvite=abc",
			planLabel: "Teams Pro",
			trialDays: 30,
			recipientName: "Jordan Lee",
			emailVariant: "warm",
		});

		expect(deliverOutboundEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				from: "Filosign <test@example.com>",
				subject: "Your filosign pilot is here.",
				to: "partner@acme.com",
			}),
		);
	});

	test("cold variant uses cold subject line", async () => {
		const { sendPartnerInviteEmail: sendEnabled } = await import(
			"@/lib/platform/email/invites"
		);

		await sendEnabled({
			to: "partner@acme.com",
			inviteUrl: "https://app.example.com/?platformInvite=abc",
			planLabel: "Teams Pro",
			trialDays: 30,
			recipientName: "Jordan Lee",
			emailVariant: "cold",
		});

		expect(deliverOutboundEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				subject: "You're invited to try filosign",
			}),
		);
	});

	test("custom variant includes custom body in rendered html", async () => {
		const { sendPartnerInviteEmail: sendEnabled } = await import(
			"@/lib/platform/email/invites"
		);

		await sendEnabled({
			to: "partner@acme.com",
			inviteUrl: "https://app.example.com/?platformInvite=abc",
			planLabel: "Teams Pro",
			trialDays: 30,
			recipientName: "Jordan Lee",
			emailVariant: "custom",
			customBody: "Looking forward to mapping your first workflow together.",
		});

		expect(deliverOutboundEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				html: expect.stringContaining(
					"Looking forward to mapping your first workflow together.",
				),
			}),
		);
	});
});
