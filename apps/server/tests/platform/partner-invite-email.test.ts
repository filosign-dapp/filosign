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

	test("sends from RESEND_FROM_PERSONAL_EMAIL", async () => {
		const { sendPartnerInviteEmail: sendEnabled } = await import(
			"@/lib/platform/email/invites"
		);

		await sendEnabled({
			to: "partner@acme.com",
			inviteUrl: "https://app.example.com/?platformInvite=abc",
			planLabel: "Teams Pro",
			trialDays: 30,
			recipientName: "Jordan Lee",
		});

		expect(deliverOutboundEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				from: testEnvStub.RESEND_FROM_PERSONAL_EMAIL,
				subject: "Jordan Lee, your Filosign design partner invite",
				to: "partner@acme.com",
			}),
		);
	});
});
