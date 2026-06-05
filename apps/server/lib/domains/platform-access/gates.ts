import type { PlanId } from "@filosign/entitlements";
import { throwAppError } from "@filosign/errors/server";
import { signupPolicyIsGated } from "@filosign/shared";
import { and, eq, gt, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import env from "@/env";
import { allowsPlatformAdminAccess } from "@/lib/platform/admin";
import db from "@/lib/platform/db";
import {
	platformAccessPending,
	platformInvites,
} from "@/lib/platform/db/schema/platform-access";
import { users } from "@/lib/platform/db/schema/user";
import {
	inviteIsActive,
	normalizeEmail,
	type PlatformGatePreview,
	planLabel,
} from "./utils/shared";

export async function previewPlatformInvite(args: {
	token: string;
}): Promise<PlatformGatePreview> {
	const token = args.token.trim();
	if (token.length < 8) {
		return { valid: false, reason: "Invalid invite link" };
	}

	const [row] = await db
		.select()
		.from(platformInvites)
		.where(eq(platformInvites.token, token))
		.limit(1);

	if (!row || !inviteIsActive(row)) {
		return { valid: false, reason: "Invite not found or expired" };
	}

	return {
		valid: true,
		gate: "platform_invite",
		lockedEmail: row.email?.trim().toLowerCase() ?? "",
		planLabel: planLabel(row.planId as PlanId),
		trialDays: row.trialDays,
		expiresAt: row.expiresAt?.toISOString() ?? null,
	};
}

export async function previewPaidSetup(args: {
	setupToken: string;
}): Promise<PlatformGatePreview> {
	const token = args.setupToken.trim();
	if (token.length < 8) {
		return { valid: false, reason: "Invalid setup link" };
	}

	const [row] = await db
		.select()
		.from(platformAccessPending)
		.where(
			and(
				eq(platformAccessPending.setupToken, token),
				eq(platformAccessPending.status, "pending_wallet"),
				gt(platformAccessPending.expiresAt, new Date()),
			),
		)
		.limit(1);

	if (!row) {
		return { valid: false, reason: "Setup link not found or expired" };
	}

	return {
		valid: true,
		gate: "paid_setup",
		lockedEmail: normalizeEmail(row.email),
		planLabel: planLabel(row.planId as PlanId),
		trialDays: null,
		expiresAt: row.expiresAt.toISOString(),
	};
}

export async function previewColdRecipientGate(args: {
	inviteToken: string;
	email: string;
}): Promise<PlatformGatePreview> {
	const token = args.inviteToken.trim();
	const email = normalizeEmail(args.email);
	if (token.length < 8 || !email) {
		return { valid: false, reason: "Invalid document invite link" };
	}

	const { fileColdInvites } = db.schema;
	const rows = await db
		.select({ email: fileColdInvites.email })
		.from(fileColdInvites)
		.where(eq(fileColdInvites.inviteToken, token));

	if (rows.length === 0) {
		return { valid: false, reason: "Document invite not found" };
	}

	const match = rows.some((r) => normalizeEmail(r.email) === email);
	if (!match) {
		return { valid: false, reason: "Email does not match this invite" };
	}

	return {
		valid: true,
		gate: "cold_recipient",
		lockedEmail: email,
		planLabel: null,
		trialDays: null,
		expiresAt: null,
	};
}

export function previewAdminBootstrap(args: {
	email: string;
}): PlatformGatePreview {
	const email = normalizeEmail(args.email);
	if (!email) {
		return { valid: false, reason: "Email is required" };
	}
	if (!allowsPlatformAdminAccess(email)) {
		return { valid: false, reason: "No account found for this email" };
	}
	return {
		valid: true,
		gate: "admin_bootstrap",
		lockedEmail: email,
		planLabel: "Teams Pro",
		trialDays: null,
		expiresAt: null,
	};
}

export async function previewReturningUserLogin(args: {
	email: string;
}): Promise<PlatformGatePreview> {
	const email = normalizeEmail(args.email);
	if (!email) {
		return { valid: false, reason: "Email is required" };
	}

	const [row] = await db
		.select({ email: users.email })
		.from(users)
		.where(eq(sql`lower(${users.email})`, email))
		.limit(1);

	if (!row?.email) {
		return { valid: false, reason: "No account found for this email" };
	}

	return {
		valid: true,
		gate: "returning_user",
		lockedEmail: normalizeEmail(row.email),
		planLabel: null,
		trialDays: null,
		expiresAt: null,
	};
}

export async function canStartEmailAuth(args: {
	email?: string;
	platformInvite?: string;
	setup?: string;
	coldInvite?: string;
	coldPieceCid?: string;
}): Promise<PlatformGatePreview> {
	if (!signupPolicyIsGated(env.DEPLOYMENT)) {
		const email = args.email?.trim();
		return {
			valid: true,
			gate: "returning_user",
			lockedEmail: email ? normalizeEmail(email) : "",
			planLabel: null,
			trialDays: null,
			expiresAt: null,
		};
	}

	if (args.setup?.trim()) {
		return previewPaidSetup({ setupToken: args.setup });
	}
	if (args.platformInvite?.trim()) {
		return previewPlatformInvite({ token: args.platformInvite });
	}
	if (
		args.coldInvite?.trim() &&
		args.coldPieceCid?.trim() &&
		args.email?.trim()
	) {
		return previewColdRecipientGate({
			inviteToken: args.coldInvite,
			email: args.email,
		});
	}
	if (args.email?.trim()) {
		const returning = await previewReturningUserLogin({ email: args.email });
		if (returning.valid) return returning;
		return previewAdminBootstrap({ email: args.email });
	}

	return {
		valid: false,
		reason: "Open the link from your email or purchase a plan to get started",
	};
}

export type RegistrationAccessGate = {
	platformInviteToken?: string;
	setupToken?: string;
	coldInviteToken?: string;
	coldRecipientEmail?: string;
};

export async function assertRegistrationAllowed(args: {
	wallet: Address;
	email: string;
	gate?: RegistrationAccessGate;
}): Promise<void> {
	if (!signupPolicyIsGated(env.DEPLOYMENT)) return;

	const emailNorm = normalizeEmail(args.email);

	const [existing] = await db
		.select({ walletAddress: users.walletAddress })
		.from(users)
		.where(eq(users.walletAddress, getAddress(args.wallet)))
		.limit(1);
	if (existing) return;

	if (args.gate?.setupToken?.trim()) {
		const preview = await previewPaidSetup({
			setupToken: args.gate.setupToken,
		});
		if (!preview.valid) {
			throwAppError("WORKSPACE.PLATFORM_INVITE_REQUIRED", {
				params: { reason: preview.reason },
			});
		}
		if (preview.lockedEmail && preview.lockedEmail !== emailNorm) {
			throwAppError("WORKSPACE.PLATFORM_EMAIL_MISMATCH");
		}
		return;
	}

	if (
		args.gate?.coldInviteToken?.trim() &&
		args.gate.coldRecipientEmail?.trim()
	) {
		const preview = await previewColdRecipientGate({
			inviteToken: args.gate.coldInviteToken,
			email: args.gate.coldRecipientEmail,
		});
		if (!preview.valid) {
			throwAppError("WORKSPACE.PLATFORM_INVITE_REQUIRED", {
				params: { reason: preview.reason },
			});
		}
		if (preview.lockedEmail !== emailNorm) {
			throwAppError("WORKSPACE.PLATFORM_EMAIL_MISMATCH");
		}
		return;
	}

	if (args.gate?.platformInviteToken?.trim()) {
		const preview = await previewPlatformInvite({
			token: args.gate.platformInviteToken,
		});
		if (!preview.valid) {
			throwAppError("WORKSPACE.PLATFORM_INVITE_REQUIRED", {
				params: { reason: preview.reason },
			});
		}
		if (preview.lockedEmail && preview.lockedEmail !== emailNorm) {
			throwAppError("WORKSPACE.PLATFORM_EMAIL_MISMATCH");
		}
		return;
	}

	if (allowsPlatformAdminAccess(emailNorm)) {
		return;
	}

	throwAppError("WORKSPACE.PLATFORM_INVITE_REQUIRED", {
		params: {
			reason: "Platform invite or paid access required to create an account",
		},
	});
}
