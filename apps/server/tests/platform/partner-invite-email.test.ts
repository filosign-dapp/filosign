import { beforeEach, describe, expect, mock, test } from "bun:test";
import { testEnvStub } from "../support/env-stub";

const deliverOutboundEmail = mock(async () => undefined);

mock.module("@/env", () => ({
	default: { ...testEnvStub },
}));

mock.module("@/lib/platform/email/email", () => ({
	deliverOutboundEmail,
}));

const { sendPartnerInviteEmail } = await import("@/lib/platform/email/invites");

beforeEach(() => {
	deliverOutboundEmail.mockClear();
});

describe("sendPartnerInviteEmail", () => {
	test("returns false when outbound email is disabled", async () => {
		const sent = await sendPartnerInviteEmail({
			to: "partner@acme.com",
			inviteUrl: "https://app.example.com/?platformInvite=abc",
			planLabel: "Teams Pro",
			trialDays: 30,
		});

		expect(sent).toBe(false);
		expect(deliverOutboundEmail).not.toHaveBeenCalled();
	});
});
