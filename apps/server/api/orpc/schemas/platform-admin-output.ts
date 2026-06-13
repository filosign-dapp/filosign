import { PLAN_IDS } from "@filosign/entitlements";
import { zPlatformInviteEmailVariant } from "@filosign/shared";
import { z } from "zod";

export const zPlatformAdminInviteCreateInput = z.object({
	kind: z.enum(["partner_trial", "manual_paid"]).default("partner_trial"),
	planId: z.enum(PLAN_IDS).default("teams_pro"),
	trialDays: z.number().int().min(1).max(365).default(30),
	email: z.email().optional().nullable(),
	featureOverrides: z
		.record(z.string(), z.union([z.number(), z.boolean()]))
		.optional(),
	maxRedemptions: z.number().int().min(1).max(100).default(1),
	expiresAt: z.iso.datetime().optional().nullable(),
	note: z.string().max(500).optional().nullable(),
	emailBody: z.string().max(2000).optional().nullable(),
	emailVariant: zPlatformInviteEmailVariant.default("warm"),
});

const platformInviteRedemptionSchema = z.object({
	walletAddress: z.string(),
	email: z.string().nullable(),
	redeemedAt: z.string(),
});

export const rpcPlatformAdminInviteRowSchema = z.object({
	id: z.uuid(),
	token: z.string(),
	kind: z.string(),
	planId: z.string(),
	trialDays: z.number().int(),
	email: z.string().nullable(),
	note: z.string().nullable(),
	emailBody: z.string().nullable(),
	emailVariant: zPlatformInviteEmailVariant,
	featureOverrides: z
		.record(z.string(), z.union([z.number(), z.boolean()]))
		.nullable()
		.optional(),
	maxRedemptions: z.number().int(),
	redemptionCount: z.number().int(),
	expiresAt: z.string().nullable(),
	revokedAt: z.string().nullable(),
	createdAt: z.string(),
	redemptions: z.array(platformInviteRedemptionSchema),
});

export const rpcPlatformAdminInvitesListOutputSchema = z.object({
	invites: z.array(rpcPlatformAdminInviteRowSchema),
});

export const rpcPlatformAdminInviteCreateOutputSchema = z.object({
	id: z.uuid(),
	token: z.string(),
	kind: z.string(),
	planId: z.string(),
	trialDays: z.number().int(),
	email: z.string().nullable(),
	note: z.string().nullable(),
	emailBody: z.string().nullable(),
	emailVariant: zPlatformInviteEmailVariant,
	emailSent: z.boolean(),
});

export const rpcPlatformAdminInviteRebookOutputSchema =
	rpcPlatformAdminInviteCreateOutputSchema.pick({
		id: true,
		token: true,
		kind: true,
		planId: true,
	});

export const rpcPlatformAdminInviteSendOutputSchema = z.object({
	emailSent: z.boolean(),
	email: z.string().nullable(),
});

export const rpcPlatformAdminUserRowSchema = z.object({
	walletAddress: z.string(),
	email: z.string().nullable(),
	createdAt: z.string(),
	planId: z.string(),
	status: z.string(),
	periodEnd: z.string().nullable(),
	featureOverrides: z.record(z.string(), z.union([z.number(), z.boolean()])),
});

export const rpcPlatformAdminUsersListOutputSchema = z.object({
	users: z.array(rpcPlatformAdminUserRowSchema),
});

export const zPlatformAdminSetFeatureOverridesInput = z.object({
	wallet: z.string().min(1),
	featureOverrides: z.record(z.string(), z.union([z.number(), z.boolean()])),
});

export const zPlatformAdminSetPlanInput = z.object({
	wallet: z.string().min(1),
	planId: z.enum(PLAN_IDS),
});

export const rpcPlatformAdminAccessRequestRowSchema = z.object({
	id: z.uuid(),
	email: z.string(),
	name: z.string().nullable(),
	company: z.string().nullable(),
	message: z.string().nullable(),
	status: z.string(),
	reviewedAt: z.string().nullable(),
	createdInviteId: z.uuid().nullable(),
	createdAt: z.string(),
});

export const rpcPlatformAdminAccessRequestsListOutputSchema = z.object({
	requests: z.array(rpcPlatformAdminAccessRequestRowSchema),
});

export const rpcPlatformAdminSettlementAccessRowSchema = z.object({
	organizationId: z.uuid(),
	organizationName: z.string(),
	status: z.string(),
	termsVersion: z.string().nullable(),
	acceptedAt: z.string(),
	acceptedByWallet: z.string(),
	useCase: z.string().nullable(),
	reviewedAt: z.string().nullable(),
	reviewedByAdminWallet: z.string().nullable(),
	reviewNote: z.string().nullable(),
});

export const rpcPlatformAdminSettlementAccessListOutputSchema = z.object({
	requests: z.array(rpcPlatformAdminSettlementAccessRowSchema),
});

export const rpcPlatformAdminSettlementAccessDecisionOutputSchema = z.object({
	status: z.string(),
	termsVersion: z.string().nullable(),
	currentTermsVersion: z.string(),
	acceptedAt: z.string().optional(),
	acceptedByWallet: z.string().optional(),
	useCase: z.string().nullable().optional(),
	reviewedAt: z.string().nullable().optional(),
	reviewNote: z.string().nullable().optional(),
	termsCurrent: z.boolean().optional(),
});
