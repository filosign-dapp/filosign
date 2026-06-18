import type { PlanId } from "@filosign/entitlements";
import { PLAN_IDS } from "@filosign/entitlements";
import { throwAppError } from "@filosign/errors/server";
import { zPlatformInviteEmailVariant } from "@filosign/shared";
import type { Address } from "viem";
import { z } from "zod";
import env from "@/env";
import {
	approveAccessRequest,
	canStartEmailAuth,
	createPlatformInvite,
	fetchRegisteredUserEmail,
	getPlatformInviteById,
	listAccessRequestsForAdmin,
	listPlatformInvites,
	listPlatformUsersForAdmin,
	normalizeEmail,
	planLabel,
	previewColdRecipientGate,
	previewPaidSetup,
	previewPlatformInvite,
	rebookPlatformInvite,
	redeemPartnerInviteForExistingUser,
	rejectAccessRequest,
	revokePlatformInvite,
	setPersonalOrgFeatureOverrides,
	setPersonalOrgPlanManual,
	submitAccessRequest,
} from "@/lib/domains/platform-access";
import {
	assertPlatformAdmin,
	isPlatformAdminForWallet,
} from "@/lib/platform/admin";
import { sendPartnerInviteEmail } from "@/lib/platform/email";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";

export const zGatePreviewOutput = z.object({
	valid: z.boolean(),
	gate: z
		.enum([
			"platform_invite",
			"paid_setup",
			"cold_recipient",
			"returning_user",
			"admin_bootstrap",
		])
		.optional(),
	lockedEmail: z.string().optional(),
	planLabel: z.string().nullable().optional(),
	trialDays: z.number().nullable().optional(),
	expiresAt: z.string().nullable().optional(),
	inviteKind: z.enum(["partner_trial", "manual_paid"]).optional(),
	reason: z.string().optional(),
});

export async function platformAccessPreviewGate(body: unknown) {
	const parsed = z
		.object({
			platformInvite: z.string().optional(),
			setup: z.string().optional(),
			coldInvite: z.string().optional(),
			coldPieceCid: z.string().optional(),
			email: z.string().optional(),
		})
		.safeParse(body);

	if (parsed.error) {
		throwZodBadRequest(parsed.error);
	}

	const result = await canStartEmailAuth(parsed.data);
	if (!result.valid) {
		return {
			valid: false as const,
			reason: result.reason,
		};
	}

	return {
		valid: true as const,
		gate: result.gate,
		lockedEmail: result.lockedEmail,
		planLabel: result.planLabel,
		trialDays: result.trialDays,
		expiresAt: result.expiresAt,
		inviteKind: result.inviteKind,
	};
}

export async function platformAccessPreviewPlatformInvite(token: string) {
	const result = await previewPlatformInvite({ token });
	if (!result.valid) {
		return { valid: false as const, reason: result.reason };
	}
	return {
		valid: true as const,
		lockedEmail: result.lockedEmail,
		planLabel: result.planLabel,
		trialDays: result.trialDays,
		expiresAt: result.expiresAt,
		inviteKind: result.inviteKind,
	};
}

export async function platformAccessPreviewSetup(setupToken: string) {
	const result = await previewPaidSetup({ setupToken });
	if (!result.valid) {
		return { valid: false as const, reason: result.reason };
	}
	return {
		valid: true as const,
		lockedEmail: result.lockedEmail,
		planLabel: result.planLabel,
		expiresAt: result.expiresAt,
	};
}

export async function platformAccessPreviewColdRecipient(args: {
	inviteToken: string;
	email: string;
}) {
	const result = await previewColdRecipientGate({
		inviteToken: args.inviteToken,
		email: args.email,
	});
	if (!result.valid) {
		return { valid: false as const, reason: result.reason };
	}
	return {
		valid: true as const,
		lockedEmail: result.lockedEmail,
	};
}

export async function platformAdminAccess(adminWallet: Address) {
	return { isAdmin: await isPlatformAdminForWallet(adminWallet) };
}

export async function platformAdminInvitesList(adminWallet: Address) {
	await assertPlatformAdmin(adminWallet);
	const invites = await listPlatformInvites();
	return { invites };
}

export async function platformAdminInvitesCreate(
	adminWallet: Address,
	body: unknown,
) {
	await assertPlatformAdmin(adminWallet);
	const parsed = z
		.object({
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
		})
		.safeParse(body);

	if (parsed.error) {
		throwZodBadRequest(parsed.error);
	}

	if (parsed.data.emailVariant === "custom" && !parsed.data.emailBody?.trim()) {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					path: ["emailBody"],
					message: "Custom message is required when email variant is custom",
				},
			]),
		);
	}

	const invite = await createPlatformInvite({
		adminWallet,
		kind: parsed.data.kind,
		planId: parsed.data.planId as PlanId,
		trialDays: parsed.data.trialDays,
		email: parsed.data.email,
		featureOverrides: parsed.data.featureOverrides,
		maxRedemptions: parsed.data.maxRedemptions,
		expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
		note: parsed.data.note,
		emailBody: parsed.data.emailBody,
		emailVariant: parsed.data.emailVariant,
	});

	return {
		id: invite.id,
		token: invite.token,
		kind: invite.kind,
		planId: invite.planId,
		trialDays: invite.trialDays,
		email: invite.email,
		note: invite.note,
		emailBody: invite.emailBody,
		emailVariant: invite.emailVariant,
		emailSent: false,
	};
}

export async function platformAdminInvitesRevoke(
	adminWallet: Address,
	inviteId: string,
) {
	await assertPlatformAdmin(adminWallet);
	const parsedId = z.uuid({ error: "inviteId required" }).safeParse(inviteId);
	if (parsedId.error) {
		throwZodBadRequest(parsedId.error);
	}
	await revokePlatformInvite(parsedId.data);
	return { ok: true as const };
}

export async function platformAdminInvitesRebook(
	adminWallet: Address,
	inviteId: string,
) {
	await assertPlatformAdmin(adminWallet);
	const parsedId = z.uuid({ error: "inviteId required" }).safeParse(inviteId);
	if (parsedId.error) {
		throwZodBadRequest(parsedId.error);
	}
	const invite = await rebookPlatformInvite({
		adminWallet,
		inviteId: parsedId.data,
	});

	return {
		id: invite.id,
		token: invite.token,
		kind: invite.kind,
		planId: invite.planId,
	};
}

export async function platformAdminInvitesSend(
	adminWallet: Address,
	inviteId: string,
) {
	await assertPlatformAdmin(adminWallet);
	const parsedId = z.uuid({ error: "inviteId required" }).safeParse(inviteId);
	if (parsedId.error) {
		throwZodBadRequest(parsedId.error);
	}

	const invite = await getPlatformInviteById(parsedId.data);
	if (!invite) {
		throwAppError("WORKSPACE.PLATFORM_INVITE_NOT_FOUND");
	}
	if (invite.revokedAt) {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					path: ["inviteId"],
					message: "Invite is revoked",
				},
			]),
		);
	}
	if (invite.kind !== "partner_trial" || !invite.email) {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					path: ["inviteId"],
					message: "Invite has no locked partner email",
				},
			]),
		);
	}
	if (invite.emailVariant === "custom" && !invite.emailBody?.trim()) {
		throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					path: ["inviteId"],
					message: "Invite is missing custom email body",
				},
			]),
		);
	}

	const inviteUrl = `${env.CLIENT_URL.replace(/\/$/, "")}/?platformInvite=${encodeURIComponent(invite.token)}`;
	const emailSent = await sendPartnerInviteEmail({
		to: normalizeEmail(invite.email),
		inviteUrl,
		planLabel: planLabel(invite.planId as PlanId),
		trialDays: invite.trialDays,
		recipientName: invite.note,
		emailVariant: invite.emailVariant,
		customBody: invite.emailBody,
	});

	return {
		emailSent,
		email: invite.email,
	};
}

export async function platformAdminUsersList(adminWallet: Address) {
	await assertPlatformAdmin(adminWallet);
	const users = await listPlatformUsersForAdmin();
	return { users };
}

export async function platformAdminUsersSetFeatureOverrides(
	adminWallet: Address,
	body: unknown,
) {
	await assertPlatformAdmin(adminWallet);
	const parsed = z
		.object({
			wallet: z.string().min(1),
			featureOverrides: z.record(
				z.string(),
				z.union([z.number(), z.boolean()]),
			),
		})
		.safeParse(body);
	if (parsed.error) {
		throwZodBadRequest(parsed.error);
	}
	await setPersonalOrgFeatureOverrides({
		wallet: parsed.data.wallet as Address,
		featureOverrides: parsed.data.featureOverrides,
	});
	return { ok: true as const };
}

export async function platformAdminUsersSetPlan(
	adminWallet: Address,
	body: unknown,
) {
	await assertPlatformAdmin(adminWallet);
	const parsed = z
		.object({
			wallet: z.string().min(1),
			planId: z.enum(PLAN_IDS),
			status: z.enum(["active", "trialing", "canceled"]).optional(),
			periodEnd: z.iso.datetime().optional().nullable(),
		})
		.safeParse(body);
	if (parsed.error) {
		throwZodBadRequest(parsed.error);
	}
	await setPersonalOrgPlanManual({
		wallet: parsed.data.wallet as Address,
		planId: parsed.data.planId,
		status: parsed.data.status,
		periodEnd: parsed.data.periodEnd ? new Date(parsed.data.periodEnd) : null,
	});
	return { ok: true as const };
}

export async function platformAccessSubmitAccessRequest(body: unknown) {
	const parsed = z
		.object({
			email: z.email(),
			name: z.string().max(120).optional(),
			company: z.string().max(120).optional(),
			message: z.string().max(2000).optional(),
			planId: z.enum(["individual", "teams", "teams_pro"]).optional(),
		})
		.safeParse(body);

	if (parsed.error) {
		throwZodBadRequest(parsed.error);
	}

	return submitAccessRequest(parsed.data);
}

export async function platformAdminAccessRequestsList(adminWallet: Address) {
	await assertPlatformAdmin(adminWallet);
	const requests = await listAccessRequestsForAdmin();
	return { requests };
}

export async function platformAdminAccessRequestsApprove(
	adminWallet: Address,
	body: unknown,
) {
	await assertPlatformAdmin(adminWallet);
	const parsed = z
		.object({
			requestId: z.uuid(),
			planId: z.enum(PLAN_IDS).optional(),
			trialDays: z.number().int().min(1).max(365).optional(),
		})
		.safeParse(body);
	if (parsed.error) {
		throwZodBadRequest(parsed.error);
	}
	return approveAccessRequest({
		adminWallet,
		requestId: parsed.data.requestId,
		planId: parsed.data.planId as PlanId | undefined,
		trialDays: parsed.data.trialDays,
	});
}

export async function platformAdminAccessRequestsReject(
	adminWallet: Address,
	requestId: string,
) {
	await assertPlatformAdmin(adminWallet);
	const parsedId = z.uuid({ error: "requestId required" }).safeParse(requestId);
	if (parsedId.error) {
		throwZodBadRequest(parsedId.error);
	}
	await rejectAccessRequest({ adminWallet, requestId: parsedId.data });
	return { ok: true as const };
}

export const zPlatformAccessRedeemPartnerInviteBody = z.object({
	platformInviteToken: z.string().min(8),
	organizationId: z.uuid().optional(),
});

export async function platformAccessRedeemPartnerInvite(
	wallet: Address,
	rawBody: unknown,
) {
	const parsed = zPlatformAccessRedeemPartnerInviteBody.safeParse(rawBody);
	if (parsed.error) {
		throwZodBadRequest(parsed.error);
	}

	const email = await fetchRegisteredUserEmail(wallet);
	const result = await redeemPartnerInviteForExistingUser({
		wallet,
		email,
		platformInviteToken: parsed.data.platformInviteToken,
		organizationId: parsed.data.organizationId,
	});

	return {
		applied: result.applied,
		organizationId: result.organizationId,
		partnerInviteTrial: result.partnerInviteTrial,
	};
}
