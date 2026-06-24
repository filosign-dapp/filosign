import { PLAN_IDS } from "@filosign/entitlements";
import {
	DEFAULT_PARTNER_TRIAL_DAYS,
	zFeedbackFeatureArea,
	zFeedbackKind,
	zFeedbackPromptType,
	zPlatformInviteEmailVariant,
} from "@filosign/shared";
import { z } from "zod";

export const zPlatformAdminInviteCreateInput = z.object({
	kind: z.enum(["partner_trial", "manual_paid"]).default("partner_trial"),
	planId: z.enum(PLAN_IDS).default("teams_pro"),
	trialDays: z
		.number()
		.int()
		.min(1)
		.max(365)
		.default(DEFAULT_PARTNER_TRIAL_DAYS),
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

export type PlatformAdminInviteCreateInput = z.infer<
	typeof zPlatformAdminInviteCreateInput
>;

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
	items: z.array(rpcPlatformAdminInviteRowSchema),
	page: z.number().int().min(1),
	pageSize: z.number().int().min(1),
	totalCount: z.number().int().min(0),
	totalPages: z.number().int().min(0),
});

export const zPlatformAdminInvitesListInput = z.object({
	page: z.number().int().min(1).default(1),
	q: z.string().max(100).optional(),
	status: z.enum(["all", "active", "revoked", "expired"]).default("all"),
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
	items: z.array(rpcPlatformAdminUserRowSchema),
	page: z.number().int().min(1),
	pageSize: z.number().int().min(1),
	totalCount: z.number().int().min(0),
	totalPages: z.number().int().min(0),
});

export const zPlatformAdminUsersListInput = z.object({
	page: z.number().int().min(1).default(1),
	q: z.string().max(100).optional(),
	planId: z.enum(PLAN_IDS).optional(),
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
	planId: z.enum(PLAN_IDS).nullable(),
	billingInterval: z.enum(["monthly", "yearly"]).nullable(),
	seatCount: z.number().int(),
	status: z.string(),
	reviewedAt: z.string().nullable(),
	createdInviteId: z.uuid().nullable(),
	createdCheckoutIntentId: z.uuid().nullable(),
	createdAt: z.string(),
});

export const rpcPlatformAdminAccessRequestsListOutputSchema = z.object({
	items: z.array(rpcPlatformAdminAccessRequestRowSchema),
	page: z.number().int().min(1),
	pageSize: z.number().int().min(1),
	totalCount: z.number().int().min(0),
	totalPages: z.number().int().min(0),
});

export const zPlatformAdminAccessRequestsListInput = z.object({
	page: z.number().int().min(1).default(1),
	q: z.string().max(100).optional(),
	status: z.enum(["all", "pending", "approved", "rejected"]).default("all"),
});

export const rpcPlatformAdminSettlementAccessRowSchema = z.object({
	organizationId: z.uuid(),
	organizationName: z.string(),
	status: z.string(),
	termsVersion: z.string().nullable(),
	acceptedAt: z.string(),
	acceptedByWallet: z.string(),
	useCase: z.string().nullable(),
	organizationLegalName: z.string().nullable(),
	organizationCountry: z.string().nullable(),
	requesterName: z.string().nullable(),
	requesterRole: z.string().nullable(),
	requestIp: z.string().nullable(),
	requestUserAgent: z.string().nullable(),
	reviewedAt: z.string().nullable(),
	reviewedByAdminWallet: z.string().nullable(),
	reviewNote: z.string().nullable(),
	externalWalletAccessEnabled: z.boolean(),
	externalWalletAccessEnabledAt: z.string().nullable(),
	externalWalletAccessRequested: z.boolean(),
	externalWalletUseCase: z.string().nullable(),
	externalWalletComplianceCertAt: z.string().nullable(),
});

export const rpcPlatformAdminSettlementAccessListOutputSchema = z.object({
	items: z.array(rpcPlatformAdminSettlementAccessRowSchema),
	page: z.number().int().min(1),
	pageSize: z.number().int().min(1),
	totalCount: z.number().int().min(0),
	totalPages: z.number().int().min(0),
});

export const zPlatformAdminSettlementAccessListInput = z.object({
	page: z.number().int().min(1).default(1),
	q: z.string().max(100).optional(),
	status: z.enum(["all", "pending", "approved", "rejected"]).default("pending"),
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
	externalWalletAccessEnabled: z.boolean().optional(),
	externalWalletAccessEnabledAt: z.string().nullable().optional(),
	externalWalletAccessRequested: z.boolean().optional(),
	externalWalletUseCase: z.string().nullable().optional(),
	externalWalletComplianceCertAt: z.string().nullable().optional(),
});

export const zPlatformAdminFeedbackListInput = z.object({
	page: z.number().int().min(1).default(1),
});

export const rpcPlatformAdminFeedbackRowSchema = z.object({
	id: z.uuid(),
	walletAddress: z.string(),
	userEmail: z.string().nullable(),
	featureArea: zFeedbackFeatureArea,
	kind: zFeedbackKind,
	route: z.string().nullable(),
	message: z.string().nullable(),
	promptType: zFeedbackPromptType,
	trigger: z.string().nullable(),
	createdAt: z.iso.datetime(),
});

export const rpcPlatformAdminFeedbackListOutputSchema = z.object({
	items: z.array(rpcPlatformAdminFeedbackRowSchema),
	page: z.number().int().min(1),
	pageSize: z.number().int().min(1),
	totalCount: z.number().int().min(0),
	totalPages: z.number().int().min(0),
});

export const rpcPlatformAdminDashboardStatsOutputSchema = z.object({
	pendingAccessRequests: z.number().int().min(0),
	pendingPayoutAccess: z.number().int().min(0),
	activeInvites: z.number().int().min(0),
	feedbackTotal: z.number().int().min(0),
});
