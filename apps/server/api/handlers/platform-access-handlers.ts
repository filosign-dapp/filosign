import type { PlanId } from "@filosign/entitlements";
import { PLAN_IDS } from "@filosign/entitlements";
import { ORPCError } from "@orpc/server";
import type { Address } from "viem";
import { z } from "zod";
import {
	approveAccessRequest,
	canStartEmailAuth,
	createPlatformInvite,
	listAccessRequestsForAdmin,
	listPlatformInvites,
	listPlatformUsersForAdmin,
	previewColdRecipientGate,
	previewPaidSetup,
	previewPlatformInvite,
	rebookPlatformInvite,
	rejectAccessRequest,
	revokePlatformInvite,
	setUserFeatureOverrides,
	setUserPlanManual,
	submitAccessRequest,
} from "@/lib/domains/platform-access";
import {
	assertPlatformAdmin,
	isPlatformAdminForWallet,
} from "@/lib/platform/admin";

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
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
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
			email: z.string().email().optional().nullable(),
			featureOverrides: z
				.record(z.string(), z.union([z.number(), z.boolean()]))
				.optional(),
			maxRedemptions: z.number().int().min(1).max(100).default(1),
			expiresAt: z.string().datetime().optional().nullable(),
			note: z.string().max(500).optional().nullable(),
		})
		.safeParse(body);

	if (parsed.error) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
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
	});

	return {
		id: invite.id,
		token: invite.token,
		kind: invite.kind,
		planId: invite.planId,
		trialDays: invite.trialDays,
		email: invite.email,
		note: invite.note,
	};
}

export async function platformAdminInvitesRevoke(
	adminWallet: Address,
	inviteId: string,
) {
	await assertPlatformAdmin(adminWallet);
	if (!inviteId) {
		throw new ORPCError("BAD_REQUEST", { message: "inviteId required" });
	}
	await revokePlatformInvite(inviteId);
	return { ok: true as const };
}

export async function platformAdminInvitesRebook(
	adminWallet: Address,
	inviteId: string,
) {
	await assertPlatformAdmin(adminWallet);
	if (!inviteId) {
		throw new ORPCError("BAD_REQUEST", { message: "inviteId required" });
	}
	const invite = await rebookPlatformInvite({ adminWallet, inviteId });
	return {
		id: invite.id,
		token: invite.token,
		kind: invite.kind,
		planId: invite.planId,
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
			walletAddress: z.string().min(1),
			featureOverrides: z.record(
				z.string(),
				z.union([z.number(), z.boolean()]),
			),
		})
		.safeParse(body);
	if (parsed.error) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}
	await setUserFeatureOverrides({
		wallet: parsed.data.walletAddress as Address,
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
			walletAddress: z.string().min(1),
			planId: z.enum(PLAN_IDS),
			status: z.enum(["active", "trialing", "canceled"]).optional(),
			periodEnd: z.string().datetime().optional().nullable(),
		})
		.safeParse(body);
	if (parsed.error) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}
	await setUserPlanManual({
		wallet: parsed.data.walletAddress as Address,
		planId: parsed.data.planId,
		status: parsed.data.status,
		periodEnd: parsed.data.periodEnd ? new Date(parsed.data.periodEnd) : null,
	});
	return { ok: true as const };
}

export async function platformAccessSubmitAccessRequest(body: unknown) {
	const parsed = z
		.object({
			email: z.string().email(),
			name: z.string().max(120).optional(),
			company: z.string().max(120).optional(),
			message: z.string().max(2000).optional(),
		})
		.safeParse(body);

	if (parsed.error) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
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
			requestId: z.string().uuid(),
			planId: z.enum(PLAN_IDS).optional(),
			trialDays: z.number().int().min(1).max(365).optional(),
		})
		.safeParse(body);
	if (parsed.error) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
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
	if (!requestId) {
		throw new ORPCError("BAD_REQUEST", { message: "requestId required" });
	}
	await rejectAccessRequest({ adminWallet, requestId });
	return { ok: true as const };
}
