import { describe, expect, test } from "bun:test";
import { requiresDesignPartnerAddendum } from "@/src/routes/-lib/utils/pilot-addendum-sign-in";

describe("requiresDesignPartnerAddendum", () => {
	test("requires addendum for platform partner invite sign-up", () => {
		expect(
			requiresDesignPartnerAddendum({
				isReturningUser: false,
				gateState: {
					status: "ready",
					gate: "platform_invite",
					lockedEmail: "partner@example.com",
					planLabel: "Teams Pro",
					needsEmailInput: false,
					inviteKind: "partner_trial",
				},
			}),
		).toBe(true);
	});

	test("defaults to required when invite kind is missing from preview", () => {
		expect(
			requiresDesignPartnerAddendum({
				isReturningUser: false,
				gateState: {
					status: "ready",
					gate: "platform_invite",
					lockedEmail: "partner@example.com",
					planLabel: "Teams Pro",
					needsEmailInput: false,
				},
			}),
		).toBe(true);
	});

	test("skips addendum for manual paid platform invite", () => {
		expect(
			requiresDesignPartnerAddendum({
				isReturningUser: false,
				gateState: {
					status: "ready",
					gate: "platform_invite",
					lockedEmail: "buyer@example.com",
					planLabel: "Teams",
					needsEmailInput: false,
					inviteKind: "manual_paid",
				},
			}),
		).toBe(false);
	});

	test("skips addendum for returning users", () => {
		expect(
			requiresDesignPartnerAddendum({
				isReturningUser: true,
				gateState: {
					status: "ready",
					gate: "platform_invite",
					lockedEmail: "partner@example.com",
					planLabel: "Teams Pro",
					needsEmailInput: false,
					inviteKind: "partner_trial",
				},
			}),
		).toBe(false);
	});
});
