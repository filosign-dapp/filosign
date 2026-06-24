import { PLAN_IDS } from "@filosign/entitlements";
import { z } from "zod";

export const zAdminPageSearch = z.object({
	page: z.number().int().min(1).catch(1),
	q: z.string().max(100).optional(),
});

export const zAdminInvitesSearch = zAdminPageSearch.extend({
	status: z.enum(["all", "active", "revoked", "expired"]).catch("all"),
});

export const zAdminAccessRequestsSearch = zAdminPageSearch.extend({
	status: z.enum(["all", "pending", "approved", "rejected"]).catch("pending"),
});

export const zAdminPayoutAccessSearch = zAdminPageSearch.extend({
	status: z.enum(["all", "pending", "approved", "rejected"]).catch("pending"),
});

export const zAdminUsersSearch = z.object({
	page: z.number().int().min(1).catch(1),
	q: z.string().max(100).optional(),
	planId: z.enum(PLAN_IDS).optional(),
});

export const zAdminFeedbackSearch = z.object({
	page: z.number().int().min(1).catch(1),
});

export type AdminInvitesSearch = z.infer<typeof zAdminInvitesSearch>;
export type AdminAccessRequestsSearch = z.infer<
	typeof zAdminAccessRequestsSearch
>;
export type AdminPayoutAccessSearch = z.infer<typeof zAdminPayoutAccessSearch>;
export type AdminUsersSearch = z.infer<typeof zAdminUsersSearch>;
export type AdminFeedbackSearch = z.infer<typeof zAdminFeedbackSearch>;
