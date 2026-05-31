import { randomBytes } from "node:crypto";
import type { PlanId } from "@filosign/entitlements";
import { signupPolicyIsGated } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { and, eq, gt, isNotNull, isNull, lt, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import env from "@/env";
import { isOrgBillingPlanId } from "@/lib/domains/billing/policy";
import {
	allowsPlatformAdminAccess,
	shouldAutoGrantTeamsProForAdminEmail,
} from "@/lib/platform/admin";
import db from "@/lib/platform/db";
import { userSubscriptions } from "@/lib/platform/db/schema/billing";
import {
	organizationMembers,
	organizationSubscriptions,
} from "@/lib/platform/db/schema/organization";
import {
	accessRequests,
	checkoutIntents,
	platformAccessPending,
	platformInviteRedemptions,
	platformInvites,
} from "@/lib/platform/db/schema/platform-access";
import { users } from "@/lib/platform/db/schema/user";
import { sendAccessRequestApprovedEmail } from "@/lib/platform/email/invites";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

export type PlatformAccessTx = Parameters<
	Parameters<typeof db.transaction>[0]
>[0];

export function generatePlatformInviteToken(): string {
	return randomBytes(24).toString("base64url");
}

export function generateSetupToken(): string {
	return randomBytes(24).toString("base64url");
}

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

function planLabel(planId: PlanId): string {
	switch (planId) {
		case "teams_pro":
			return "Teams Pro";
		case "teams":
			return "Teams";
		case "individual":
			return "Individual";
		case "enterprise":
			return "Enterprise";
		default:
			return "Free";
	}
}

export type PlatformGatePreview =
	| {
			valid: true;
			gate:
				| "platform_invite"
				| "paid_setup"
				| "cold_recipient"
				| "returning_user"
				| "admin_bootstrap";
			lockedEmail: string;
			planLabel: string | null;
			trialDays: number | null;
			expiresAt: string | null;
	  }
	| {
			valid: false;
			reason: string;
	  };

function inviteIsActive(row: {
	revokedAt: Date | null;
	expiresAt: Date | null;
	maxRedemptions: number;
	redemptionCount: number;
}): boolean {
	if (row.revokedAt) return false;
	if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) return false;
	if (row.redemptionCount >= row.maxRedemptions) return false;
	return true;
}

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
			throw new ORPCError("FORBIDDEN", {
				message: preview.reason,
				data: { code: "INVITE_REQUIRED" },
			});
		}
		if (preview.lockedEmail && preview.lockedEmail !== emailNorm) {
			throw new ORPCError("FORBIDDEN", {
				message: "Email does not match paid setup",
				data: { code: "EMAIL_MISMATCH" },
			});
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
			throw new ORPCError("FORBIDDEN", {
				message: preview.reason,
				data: { code: "INVITE_REQUIRED" },
			});
		}
		if (preview.lockedEmail !== emailNorm) {
			throw new ORPCError("FORBIDDEN", {
				message: "Email does not match document invite",
				data: { code: "EMAIL_MISMATCH" },
			});
		}
		return;
	}

	if (args.gate?.platformInviteToken?.trim()) {
		const preview = await previewPlatformInvite({
			token: args.gate.platformInviteToken,
		});
		if (!preview.valid) {
			throw new ORPCError("FORBIDDEN", {
				message: preview.reason,
				data: { code: "INVITE_REQUIRED" },
			});
		}
		if (preview.lockedEmail && preview.lockedEmail !== emailNorm) {
			throw new ORPCError("FORBIDDEN", {
				message: "Email does not match invite",
				data: { code: "EMAIL_MISMATCH" },
			});
		}
		return;
	}

	if (allowsPlatformAdminAccess(emailNorm)) {
		return;
	}

	throw new ORPCError("FORBIDDEN", {
		message: "Platform invite or paid access required to create an account",
		data: { code: "INVITE_REQUIRED" },
	});
}

export async function setUserPlanManualWithTx(
	tx: PlatformAccessTx,
	args: {
		wallet: Address;
		planId: PlanId;
		status?: "active" | "trialing" | "canceled";
		periodEnd?: Date | null;
	},
): Promise<void> {
	const wallet = getAddress(args.wallet);
	await tx
		.insert(userSubscriptions)
		.values({
			walletAddress: wallet,
			planId: args.planId,
			status: args.status ?? "active",
			provider: "manual",
			periodStart: new Date(),
			periodEnd: args.periodEnd ?? null,
		})
		.onConflictDoUpdate({
			target: userSubscriptions.walletAddress,
			set: {
				planId: args.planId,
				status: args.status ?? "active",
				provider: "manual",
				periodEnd: args.periodEnd ?? null,
				updatedAt: new Date(),
			},
		});
}

export async function setOrgPlanManualWithTx(
	tx: PlatformAccessTx,
	args: {
		organizationId: string;
		planId: "teams" | "teams_pro";
		seatCount?: number;
		status?: "active" | "trialing" | "canceled";
	},
): Promise<void> {
	const seatCount =
		typeof args.seatCount === "number" &&
		Number.isInteger(args.seatCount) &&
		args.seatCount >= 1
			? args.seatCount
			: 1;
	await tx
		.update(organizationSubscriptions)
		.set({
			planId: args.planId,
			seatCount,
			status: args.status ?? "active",
			provider: "manual",
			updatedAt: new Date(),
		})
		.where(eq(organizationSubscriptions.organizationId, args.organizationId));
}

export async function grantAdminUserTeamsProIfEligibleWithTx(
	tx: PlatformAccessTx,
	args: { wallet: Address; email: string },
): Promise<void> {
	if (!shouldAutoGrantTeamsProForAdminEmail(args.email)) return;
	await setUserPlanManualWithTx(tx, {
		wallet: args.wallet,
		planId: "teams_pro",
		status: "active",
	});
}

export async function grantAdminOrgTeamsProIfEligibleWithTx(
	tx: PlatformAccessTx,
	args: { organizationId: string; creatorEmail: string | null },
): Promise<void> {
	if (!shouldAutoGrantTeamsProForAdminEmail(args.creatorEmail)) return;
	await setOrgPlanManualWithTx(tx, {
		organizationId: args.organizationId,
		planId: "teams_pro",
		seatCount: 1,
		status: "active",
	});
}

export async function grantDevPlansForAdminEmail(email: string): Promise<{
	userGrants: number;
	orgGrants: number;
}> {
	const emailNorm = normalizeEmail(email);
	if (!shouldAutoGrantTeamsProForAdminEmail(emailNorm)) {
		return { userGrants: 0, orgGrants: 0 };
	}

	const [userRow] = await db
		.select({ walletAddress: users.walletAddress })
		.from(users)
		.where(eq(sql`lower(${users.email})`, emailNorm))
		.limit(1);

	let userGrants = 0;
	if (userRow) {
		await setUserPlanManual({
			wallet: userRow.walletAddress,
			planId: "teams_pro",
			status: "active",
		});
		userGrants = 1;
	}

	const orgRows = userRow
		? await db
				.select({ organizationId: organizationSubscriptions.organizationId })
				.from(organizationSubscriptions)
				.innerJoin(
					organizationMembers,
					eq(
						organizationMembers.organizationId,
						organizationSubscriptions.organizationId,
					),
				)
				.where(
					and(
						eq(organizationMembers.walletAddress, userRow.walletAddress),
						eq(organizationMembers.role, "owner"),
						eq(organizationMembers.status, "active"),
					),
				)
		: [];

	let orgGrants = 0;
	for (const row of orgRows) {
		await db
			.update(organizationSubscriptions)
			.set({
				planId: "teams_pro",
				seatCount: 1,
				status: "active",
				provider: "manual",
				updatedAt: new Date(),
			})
			.where(eq(organizationSubscriptions.organizationId, row.organizationId));
		orgGrants += 1;
	}

	return { userGrants, orgGrants };
}

export async function redeemPlatformInviteOnRegisterWithTx(
	tx: PlatformAccessTx,
	args: {
		wallet: Address;
		email: string;
		platformInviteToken: string;
	},
): Promise<void> {
	const token = args.platformInviteToken.trim();
	const emailNorm = normalizeEmail(args.email);
	const wallet = getAddress(args.wallet);

	const [invite] = await tx
		.select()
		.from(platformInvites)
		.where(eq(platformInvites.token, token))
		.limit(1);

	if (!invite || !inviteIsActive(invite)) {
		throw new ORPCError("FORBIDDEN", { message: "Invite not valid" });
	}
	if (invite.email && normalizeEmail(invite.email) !== emailNorm) {
		throw new ORPCError("FORBIDDEN", {
			message: "Email does not match invite",
		});
	}

	const [existingRedemption] = await tx
		.select({ id: platformInviteRedemptions.id })
		.from(platformInviteRedemptions)
		.where(
			and(
				eq(platformInviteRedemptions.inviteId, invite.id),
				eq(platformInviteRedemptions.walletAddress, wallet),
			),
		)
		.limit(1);

	if (existingRedemption) {
		return;
	}

	const periodEnd = new Date();
	periodEnd.setDate(periodEnd.getDate() + invite.trialDays);

	await tx.insert(userSubscriptions).values({
		walletAddress: wallet,
		planId: invite.planId,
		status: "trialing",
		provider: "manual",
		periodStart: new Date(),
		periodEnd,
		featureOverrides: invite.featureOverrides ?? {},
	});

	await tx.insert(platformInviteRedemptions).values({
		inviteId: invite.id,
		walletAddress: wallet,
		email: emailNorm,
	});

	await tx
		.update(platformInvites)
		.set({
			redemptionCount: sql`${platformInvites.redemptionCount} + 1`,
			updatedAt: new Date(),
		})
		.where(eq(platformInvites.id, invite.id));
}

export async function redeemPlatformInviteOnRegister(args: {
	wallet: Address;
	email: string;
	platformInviteToken: string;
}): Promise<void> {
	await db.transaction(async (tx) => {
		await redeemPlatformInviteOnRegisterWithTx(tx, args);
	});
}

export async function linkPaidSetupOnRegisterWithTx(
	tx: PlatformAccessTx,
	args: {
		wallet: Address;
		email: string;
		setupToken: string;
	},
): Promise<void> {
	const token = args.setupToken.trim();
	const emailNorm = normalizeEmail(args.email);
	const wallet = getAddress(args.wallet);

	const [pending] = await tx
		.select()
		.from(platformAccessPending)
		.where(eq(platformAccessPending.setupToken, token))
		.limit(1);

	if (!pending) {
		throw new ORPCError("FORBIDDEN", { message: "Invalid setup token" });
	}

	if (pending.status === "linked") {
		if (
			pending.linkedWallet &&
			getAddress(pending.linkedWallet) === wallet &&
			normalizeEmail(pending.email) === emailNorm
		) {
			return;
		}
		throw new ORPCError("FORBIDDEN", {
			message: "Setup token already used",
		});
	}

	if (
		pending.status !== "pending_wallet" ||
		pending.expiresAt.getTime() <= Date.now()
	) {
		throw new ORPCError("FORBIDDEN", { message: "Invalid setup token" });
	}

	if (normalizeEmail(pending.email) !== emailNorm) {
		throw new ORPCError("FORBIDDEN", { message: "Invalid setup token" });
	}

	await tx
		.update(platformAccessPending)
		.set({
			status: "linked",
			linkedWallet: wallet,
			updatedAt: new Date(),
		})
		.where(eq(platformAccessPending.id, pending.id));

	// Paid Solo and Teams attach to the workspace on create (see attachPendingOrgBillingOnCreateWithTx).
}

/** Attach paid Teams checkout to the creator's first workspace. */
export async function attachPendingOrgBillingOnCreateWithTx(
	tx: PlatformAccessTx,
	args: {
		creatorWallet: Address;
		organizationId: string;
	},
): Promise<void> {
	const wallet = getAddress(args.creatorWallet);

	const [pending] = await tx
		.select()
		.from(platformAccessPending)
		.where(
			and(
				eq(platformAccessPending.linkedWallet, wallet),
				eq(platformAccessPending.status, "linked"),
				isNull(platformAccessPending.linkedOrganizationId),
			),
		)
		.limit(1);

	if (
		!pending?.dodoSubscriptionId ||
		(pending.planId !== "individual" && !isOrgBillingPlanId(pending.planId))
	) {
		return;
	}

	const seatCount = pending.planId === "individual" ? 1 : pending.seatCount;

	await tx
		.update(organizationSubscriptions)
		.set({
			planId: pending.planId,
			seatCount,
			status: "active",
			provider: "dodo",
			dodoSubscriptionId: pending.dodoSubscriptionId,
			dodoCustomerId: pending.dodoCustomerId ?? undefined,
			billingInterval: pending.billingInterval ?? undefined,
			updatedAt: new Date(),
		})
		.where(eq(organizationSubscriptions.organizationId, args.organizationId));

	await tx
		.update(platformAccessPending)
		.set({
			linkedOrganizationId: args.organizationId,
			updatedAt: new Date(),
		})
		.where(eq(platformAccessPending.id, pending.id));
}

export async function linkPaidSetupOnRegister(args: {
	wallet: Address;
	email: string;
	setupToken: string;
}): Promise<void> {
	await db.transaction(async (tx) => {
		await linkPaidSetupOnRegisterWithTx(tx, args);
	});
}

/** Ensures onboarding finished (user row exists). Does not gate on subscription status. */
export async function assertRegistrationComplete(
	wallet: Address,
): Promise<void> {
	if (!signupPolicyIsGated(env.DEPLOYMENT)) return;

	const walletNorm = getAddress(wallet);
	const [userRow] = await db
		.select({ walletAddress: users.walletAddress })
		.from(users)
		.where(eq(users.walletAddress, walletNorm))
		.limit(1);

	if (!userRow) {
		throw new ORPCError("FORBIDDEN", {
			message: "Complete account setup to continue",
			data: { code: "INVITE_REQUIRED" },
		});
	}
}

/** @deprecated Use {@link assertRegistrationComplete}. */
export const assertPlatformAccess = assertRegistrationComplete;

export async function createPlatformInvite(args: {
	adminWallet: Address;
	kind: "partner_trial" | "manual_paid";
	planId: PlanId;
	trialDays?: number;
	email?: string | null;
	featureOverrides?: Record<string, number | boolean>;
	maxRedemptions?: number;
	expiresAt?: Date | null;
	note?: string | null;
}) {
	const token = generatePlatformInviteToken();
	const [row] = await db
		.insert(platformInvites)
		.values({
			token,
			kind: args.kind,
			planId: args.planId,
			trialDays: args.trialDays ?? 30,
			email: args.email?.trim().toLowerCase() || null,
			featureOverrides: args.featureOverrides ?? {},
			maxRedemptions: args.maxRedemptions ?? 1,
			expiresAt: args.expiresAt ?? null,
			createdByAdminWallet: getAddress(args.adminWallet),
			note: args.note?.trim() || null,
		})
		.returning();

	if (!row) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to create invite",
		});
	}

	return row;
}

export async function revokePlatformInvite(inviteId: string): Promise<void> {
	await db
		.update(platformInvites)
		.set({ revokedAt: new Date(), updatedAt: new Date() })
		.where(
			and(eq(platformInvites.id, inviteId), isNull(platformInvites.revokedAt)),
		);
}

export async function rebookPlatformInvite(args: {
	adminWallet: Address;
	inviteId: string;
}) {
	const [old] = await db
		.select()
		.from(platformInvites)
		.where(eq(platformInvites.id, args.inviteId))
		.limit(1);
	if (!old) {
		throw new ORPCError("NOT_FOUND", { message: "Invite not found" });
	}

	await revokePlatformInvite(old.id);

	return createPlatformInvite({
		adminWallet: args.adminWallet,
		kind: old.kind,
		planId: old.planId as PlanId,
		trialDays: old.trialDays,
		email: old.email,
		featureOverrides: old.featureOverrides ?? {},
		maxRedemptions: old.maxRedemptions,
		expiresAt: old.expiresAt,
		note: old.note,
	});
}

export async function listPlatformInvites() {
	const rows = await db
		.select({
			id: platformInvites.id,
			token: platformInvites.token,
			kind: platformInvites.kind,
			email: platformInvites.email,
			planId: platformInvites.planId,
			trialDays: platformInvites.trialDays,
			featureOverrides: platformInvites.featureOverrides,
			maxRedemptions: platformInvites.maxRedemptions,
			redemptionCount: platformInvites.redemptionCount,
			expiresAt: platformInvites.expiresAt,
			revokedAt: platformInvites.revokedAt,
			note: platformInvites.note,
			createdAt: platformInvites.createdAt,
		})
		.from(platformInvites)
		.orderBy(sql`${platformInvites.createdAt} desc`);

	const redemptions = await db
		.select({
			inviteId: platformInviteRedemptions.inviteId,
			walletAddress: platformInviteRedemptions.walletAddress,
			email: platformInviteRedemptions.email,
			redeemedAt: platformInviteRedemptions.redeemedAt,
		})
		.from(platformInviteRedemptions);

	const byInvite = new Map<string, typeof redemptions>();
	for (const r of redemptions) {
		const list = byInvite.get(r.inviteId) ?? [];
		list.push(r);
		byInvite.set(r.inviteId, list);
	}

	return rows.map((row) => ({
		...row,
		expiresAt: row.expiresAt?.toISOString() ?? null,
		revokedAt: row.revokedAt?.toISOString() ?? null,
		createdAt: row.createdAt.toISOString(),
		redemptions: (byInvite.get(row.id) ?? []).map((r) => ({
			walletAddress: r.walletAddress,
			email: r.email,
			redeemedAt: r.redeemedAt.toISOString(),
		})),
	}));
}

export async function listPlatformUsersForAdmin() {
	const rows = await db
		.select({
			walletAddress: users.walletAddress,
			email: users.email,
			createdAt: users.createdAt,
			planId: userSubscriptions.planId,
			status: userSubscriptions.status,
			periodEnd: userSubscriptions.periodEnd,
			featureOverrides: userSubscriptions.featureOverrides,
		})
		.from(users)
		.leftJoin(
			userSubscriptions,
			eq(users.walletAddress, userSubscriptions.walletAddress),
		)
		.orderBy(sql`${users.createdAt} desc`)
		.limit(500);

	return rows.map((row) => ({
		walletAddress: row.walletAddress,
		email: row.email,
		createdAt: row.createdAt.toISOString(),
		planId: row.planId ?? "free",
		status: row.status ?? "active",
		periodEnd: row.periodEnd?.toISOString() ?? null,
		featureOverrides: row.featureOverrides ?? {},
	}));
}

export async function setUserFeatureOverrides(args: {
	wallet: Address;
	featureOverrides: Record<string, number | boolean>;
}) {
	const wallet = getAddress(args.wallet);
	const res = await tryCatch(
		db
			.update(userSubscriptions)
			.set({
				featureOverrides: args.featureOverrides,
				updatedAt: new Date(),
			})
			.where(eq(userSubscriptions.walletAddress, wallet)),
	);
	if (res.error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to update overrides",
		});
	}
}

export async function setUserPlanManual(args: {
	wallet: Address;
	planId: PlanId;
	status?: "active" | "trialing" | "canceled";
	periodEnd?: Date | null;
}) {
	const wallet = getAddress(args.wallet);
	await db
		.insert(userSubscriptions)
		.values({
			walletAddress: wallet,
			planId: args.planId,
			status: args.status ?? "active",
			provider: "manual",
			periodStart: new Date(),
			periodEnd: args.periodEnd ?? null,
		})
		.onConflictDoUpdate({
			target: userSubscriptions.walletAddress,
			set: {
				planId: args.planId,
				status: args.status ?? "active",
				provider: "manual",
				periodEnd: args.periodEnd ?? null,
				updatedAt: new Date(),
			},
		});
}

export async function expirePartnerTrialsJob(): Promise<{ expired: number }> {
	const now = new Date();
	const rows = await db
		.select({
			walletAddress: userSubscriptions.walletAddress,
		})
		.from(userSubscriptions)
		.where(
			and(
				eq(userSubscriptions.status, "trialing"),
				eq(userSubscriptions.provider, "manual"),
				isNotNull(userSubscriptions.periodEnd),
				lt(userSubscriptions.periodEnd, now),
			),
		);

	if (rows.length === 0) return { expired: 0 };

	await db
		.update(userSubscriptions)
		.set({ status: "canceled", updatedAt: now })
		.where(
			and(
				eq(userSubscriptions.status, "trialing"),
				eq(userSubscriptions.provider, "manual"),
				isNotNull(userSubscriptions.periodEnd),
				lt(userSubscriptions.periodEnd, now),
			),
		);

	return { expired: rows.length };
}

const PAID_SETUP_TTL_DAYS = 30;

export async function upsertPaidAccessPendingFromWebhook(
	tx: PlatformAccessTx,
	args: {
		setupToken: string;
		email: string;
		planId: PlanId;
		dodoSubscriptionId: string;
		dodoCustomerId?: string | null;
		seatCount?: number;
		billingInterval?: "monthly" | "yearly" | null;
		checkoutIntentId?: string | null;
	},
): Promise<{ created: boolean }> {
	const emailNorm = normalizeEmail(args.email);
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + PAID_SETUP_TTL_DAYS);
	const seatCount =
		typeof args.seatCount === "number" &&
		Number.isInteger(args.seatCount) &&
		args.seatCount >= 1
			? args.seatCount
			: 1;

	const [existing] = await tx
		.select({ id: platformAccessPending.id })
		.from(platformAccessPending)
		.where(
			eq(platformAccessPending.dodoSubscriptionId, args.dodoSubscriptionId),
		)
		.limit(1);

	if (existing) {
		await tx
			.update(platformAccessPending)
			.set({
				email: emailNorm,
				planId: args.planId,
				setupToken: args.setupToken,
				dodoCustomerId: args.dodoCustomerId ?? undefined,
				seatCount,
				billingInterval: args.billingInterval ?? undefined,
				status: "pending_wallet",
				expiresAt,
				updatedAt: new Date(),
			})
			.where(eq(platformAccessPending.id, existing.id));
	} else {
		await tx.insert(platformAccessPending).values({
			setupToken: args.setupToken,
			email: emailNorm,
			planId: args.planId,
			dodoSubscriptionId: args.dodoSubscriptionId,
			dodoCustomerId: args.dodoCustomerId ?? undefined,
			seatCount,
			billingInterval: args.billingInterval ?? undefined,
			status: "pending_wallet",
			expiresAt,
		});
	}

	if (args.checkoutIntentId) {
		await tx
			.update(checkoutIntents)
			.set({ status: "completed", updatedAt: new Date() })
			.where(eq(checkoutIntents.id, args.checkoutIntentId));
	}

	return { created: !existing };
}

export async function submitAccessRequest(args: {
	email: string;
	name?: string | null;
	company?: string | null;
	message?: string | null;
}): Promise<{ ok: true }> {
	const email = normalizeEmail(args.email);
	if (!email) {
		throw new ORPCError("BAD_REQUEST", { message: "Email is required" });
	}

	const [existingPending] = await db
		.select({ id: accessRequests.id })
		.from(accessRequests)
		.where(
			and(
				eq(accessRequests.email, email),
				eq(accessRequests.status, "pending"),
			),
		)
		.limit(1);

	if (existingPending) {
		return { ok: true };
	}

	await db.insert(accessRequests).values({
		email,
		name: args.name?.trim() || null,
		company: args.company?.trim() || null,
		message: args.message?.trim() || null,
	});

	return { ok: true };
}

export async function listAccessRequestsForAdmin() {
	const rows = await db
		.select({
			id: accessRequests.id,
			email: accessRequests.email,
			name: accessRequests.name,
			company: accessRequests.company,
			message: accessRequests.message,
			status: accessRequests.status,
			reviewedAt: accessRequests.reviewedAt,
			createdInviteId: accessRequests.createdInviteId,
			createdAt: accessRequests.createdAt,
		})
		.from(accessRequests)
		.orderBy(sql`${accessRequests.createdAt} desc`)
		.limit(200);

	return rows.map((row) => ({
		...row,
		reviewedAt: row.reviewedAt?.toISOString() ?? null,
		createdAt: row.createdAt.toISOString(),
	}));
}

export async function approveAccessRequest(args: {
	adminWallet: Address;
	requestId: string;
	planId?: PlanId;
	trialDays?: number;
}): Promise<{ inviteToken: string; inviteUrl: string }> {
	const [request] = await db
		.select()
		.from(accessRequests)
		.where(eq(accessRequests.id, args.requestId))
		.limit(1);

	if (!request || request.status !== "pending") {
		throw new ORPCError("NOT_FOUND", { message: "Access request not found" });
	}

	const invite = await createPlatformInvite({
		adminWallet: args.adminWallet,
		kind: "partner_trial",
		planId: args.planId ?? "teams_pro",
		trialDays: args.trialDays ?? 30,
		email: request.email,
		note: request.company
			? `Approved waitlist: ${request.company}`
			: "Approved waitlist request",
	});

	await db
		.update(accessRequests)
		.set({
			status: "approved",
			reviewedAt: new Date(),
			reviewedByAdminWallet: getAddress(args.adminWallet),
			createdInviteId: invite.id,
			updatedAt: new Date(),
		})
		.where(eq(accessRequests.id, request.id));

	const inviteUrl = `${env.CLIENT_URL.replace(/\/$/, "")}/?platformInvite=${encodeURIComponent(invite.token)}`;

	await sendAccessRequestApprovedEmail({
		to: normalizeEmail(request.email),
		inviteUrl,
		planLabel: planLabel(invite.planId as PlanId),
		trialDays: invite.trialDays,
	});

	return { inviteToken: invite.token, inviteUrl };
}

export async function rejectAccessRequest(args: {
	adminWallet: Address;
	requestId: string;
}): Promise<void> {
	const [request] = await db
		.select({ id: accessRequests.id, status: accessRequests.status })
		.from(accessRequests)
		.where(eq(accessRequests.id, args.requestId))
		.limit(1);

	if (!request || request.status !== "pending") {
		throw new ORPCError("NOT_FOUND", { message: "Access request not found" });
	}

	await db
		.update(accessRequests)
		.set({
			status: "rejected",
			reviewedAt: new Date(),
			reviewedByAdminWallet: getAddress(args.adminWallet),
			updatedAt: new Date(),
		})
		.where(eq(accessRequests.id, request.id));
}
