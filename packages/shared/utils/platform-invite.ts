import { z } from "zod";

export const platformInviteEmailVariants = ["warm", "cold", "custom"] as const;

export type PlatformInviteEmailVariant =
	(typeof platformInviteEmailVariants)[number];

export const zPlatformInviteEmailVariant = z.enum(platformInviteEmailVariants);
