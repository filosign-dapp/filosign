import { z } from "zod";

export const platformInviteEmailVariants = ["warm", "cold", "custom"] as const;

export type PlatformInviteEmailVariant =
	(typeof platformInviteEmailVariants)[number];

export const zPlatformInviteEmailVariant = z.enum(platformInviteEmailVariants);

/** Default trial length for design partner (`partner_trial`) platform invites. */
export const DEFAULT_PARTNER_TRIAL_DAYS = 30;

/** Default workspace seat count when a design partner trial is applied. */
export const DEFAULT_PARTNER_TRIAL_SEAT_COUNT = 3;
