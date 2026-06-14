import type { PlatformInviteEmailVariant } from "../utils/platform-invite";

export type PlatformInviteKind = "partner_trial" | "manual_paid";

/** PostHog / server analytics property keys for design partner invite funnel events. */
export const PLATFORM_INVITE_ANALYTICS_KEYS = {
	emailVariant: "email_variant",
	inviteId: "invite_id",
	planId: "plan_id",
	trialDays: "trial_days",
	inviteKind: "invite_kind",
} as const;

export function platformInviteAnalyticsProperties(args: {
	inviteId: string;
	emailVariant: PlatformInviteEmailVariant;
	planId: string;
	trialDays: number;
	inviteKind: PlatformInviteKind;
}): Record<string, string | number> {
	return {
		[PLATFORM_INVITE_ANALYTICS_KEYS.emailVariant]: args.emailVariant,
		[PLATFORM_INVITE_ANALYTICS_KEYS.inviteId]: args.inviteId,
		[PLATFORM_INVITE_ANALYTICS_KEYS.planId]: args.planId,
		[PLATFORM_INVITE_ANALYTICS_KEYS.trialDays]: args.trialDays,
		[PLATFORM_INVITE_ANALYTICS_KEYS.inviteKind]: args.inviteKind,
	};
}
