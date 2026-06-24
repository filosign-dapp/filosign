import { describe, expect, test } from "bun:test";
import {
	PLATFORM_INVITE_ANALYTICS_KEYS,
	platformInviteAnalyticsProperties,
} from "../platform-invite/analytics";
import { DEFAULT_PARTNER_TRIAL_DAYS } from "../utils/platform-invite";

describe("platformInviteAnalyticsProperties", () => {
	test("maps invite fields to PostHog property keys", () => {
		expect(
			platformInviteAnalyticsProperties({
				inviteId: "invite-123",
				emailVariant: "cold",
				planId: "teams_pro",
				trialDays: DEFAULT_PARTNER_TRIAL_DAYS,
				inviteKind: "partner_trial",
			}),
		).toEqual({
			[PLATFORM_INVITE_ANALYTICS_KEYS.emailVariant]: "cold",
			[PLATFORM_INVITE_ANALYTICS_KEYS.inviteId]: "invite-123",
			[PLATFORM_INVITE_ANALYTICS_KEYS.planId]: "teams_pro",
			[PLATFORM_INVITE_ANALYTICS_KEYS.trialDays]: DEFAULT_PARTNER_TRIAL_DAYS,
			[PLATFORM_INVITE_ANALYTICS_KEYS.inviteKind]: "partner_trial",
		});
	});
});
