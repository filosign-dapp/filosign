import { describe, expect, test } from "bun:test";
import {
	PLATFORM_INVITE_ANALYTICS_KEYS,
	platformInviteAnalyticsProperties,
} from "../platform-invite/analytics";

describe("platformInviteAnalyticsProperties", () => {
	test("maps invite fields to PostHog property keys", () => {
		expect(
			platformInviteAnalyticsProperties({
				inviteId: "invite-123",
				emailVariant: "cold",
				planId: "teams_pro",
				trialDays: 30,
				inviteKind: "partner_trial",
			}),
		).toEqual({
			[PLATFORM_INVITE_ANALYTICS_KEYS.emailVariant]: "cold",
			[PLATFORM_INVITE_ANALYTICS_KEYS.inviteId]: "invite-123",
			[PLATFORM_INVITE_ANALYTICS_KEYS.planId]: "teams_pro",
			[PLATFORM_INVITE_ANALYTICS_KEYS.trialDays]: 30,
			[PLATFORM_INVITE_ANALYTICS_KEYS.inviteKind]: "partner_trial",
		});
	});
});
