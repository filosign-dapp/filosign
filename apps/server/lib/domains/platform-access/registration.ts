import { getPlanName, type PlanId } from "@filosign/entitlements";
import { throwAppError } from "@filosign/errors/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { isOrgBillingPlanId } from "@/lib/domains/billing/utils/policy";
import {
	emitPartnerInviteRedeemedPing,
	trackPlatformInviteRedeemed,
} from "@/lib/platform/analytics";
import {
	CACHE_TTL,
	cacheAside,
	cacheKeys,
	defaultDeserialize,
	defaultSerialize,
} from "@/lib/platform/cache";
import db from "@/lib/platform/db";
import { organizationSubscriptions } from "@/lib/platform/db/schema/organization";
import {
	platformAccessPending,
	platformInviteRedemptions,
	platformInvites,
} from "@/lib/platform/db/schema/platform-access";
import { users } from "@/lib/platform/db/schema/user";
import { serverSignupPolicyIsGated } from "@/lib/platform/public-fences";
import { assertWalletEligibleForPartnerTrial } from "./utils/partner-trial-guards";
import {
	inviteIsActive,
	normalizeEmail,
	type PlatformAccessTx,
} from "./utils/shared";

export type PartnerTrialSubscriptionRow = {
	planId: string;
	status: string;
	provider: string;
	periodStart: Date;
	periodEnd: Date | null;
	featureOverrides: Record<string, unknown>;
};

export function isActivePartnerTrialSubscription(
	sub: PartnerTrialSubscriptionRow | undefined,
	now = new Date(),
): sub is PartnerTrialSubscriptionRow & {
	planId: "teams" | "teams_pro";
	periodEnd: Date;
} {
	if (!sub) return false;
	if (sub.status !== "trialing" || sub.provider !== "manual") return false;
	if (!isOrgBillingPlanId(sub.planId)) return false;
	if (!sub.periodEnd || sub.periodEnd.getTime() <= now.getTime()) return false;
	return true;
}

async function fetchUserExists(wallet: Address): Promise<boolean> {
	const walletNorm = getAddress(wallet);
	const [row] = await db
		.select({ walletAddress: users.walletAddress })
		.from(users)
		.where(eq(users.walletAddress, walletNorm))
		.limit(1);
	return Boolean(row);
}

export async function isUserRegistered(wallet: Address): Promise<boolean> {
	return cacheAside({
		key: cacheKeys.userExists(getAddress(wallet)),
		ttlSec: CACHE_TTL.userExists,
		fetch: () => fetchUserExists(wallet),
		serialize: defaultSerialize,
		deserialize: defaultDeserialize,
	});
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
		throwAppError("WORKSPACE.PLATFORM_INVITE_NOT_FOUND");
	}
	if (invite.email && normalizeEmail(invite.email) !== emailNorm) {
		throwAppError("WORKSPACE.PLATFORM_EMAIL_MISMATCH");
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

	await assertWalletEligibleForPartnerTrial(tx, wallet);

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

	trackPlatformInviteRedeemed({
		wallet,
		inviteId: invite.id,
		emailVariant: invite.emailVariant,
		planId: invite.planId,
		trialDays: invite.trialDays,
		inviteKind: invite.kind,
	});

	void emitPartnerInviteRedeemedPing({
		wallet,
		email: emailNorm,
		inviteId: invite.id,
		inviteKind: invite.kind,
		emailVariant: invite.emailVariant,
		planId: invite.planId,
		trialDays: invite.trialDays,
	});
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
		throwAppError("WORKSPACE.PLATFORM_INVITE_NOT_FOUND");
	}

	if (pending.status === "linked") {
		if (
			pending.linkedWallet &&
			getAddress(pending.linkedWallet) === wallet &&
			normalizeEmail(pending.email) === emailNorm
		) {
			return;
		}
		throwAppError("WORKSPACE.PLATFORM_INVITE_NOT_FOUND");
	}

	if (
		pending.status !== "pending_wallet" ||
		pending.expiresAt.getTime() <= Date.now()
	) {
		throwAppError("WORKSPACE.PLATFORM_INVITE_NOT_FOUND");
	}

	if (normalizeEmail(pending.email) !== emailNorm) {
		throwAppError("WORKSPACE.PLATFORM_EMAIL_MISMATCH");
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

/** Attach paid checkout to a workspace on create (first org or additional with pendingBillingId). */
export async function attachPendingOrgBillingOnCreateWithTx(
	tx: PlatformAccessTx,
	args: {
		creatorWallet: Address;
		organizationId: string;
		pendingBillingId?: string | null;
		isPersonalOrg: boolean;
	},
): Promise<boolean> {
	const wallet = getAddress(args.creatorWallet);
	const pendingBillingId = args.pendingBillingId?.trim() || null;

	const pending = pendingBillingId
		? (
				await tx
					.select()
					.from(platformAccessPending)
					.where(
						and(
							eq(platformAccessPending.id, pendingBillingId),
							eq(platformAccessPending.linkedWallet, wallet),
							eq(platformAccessPending.status, "linked"),
							isNull(platformAccessPending.linkedOrganizationId),
						),
					)
					.limit(1)
			)[0]
		: (
				await tx
					.select()
					.from(platformAccessPending)
					.where(
						and(
							eq(platformAccessPending.linkedWallet, wallet),
							eq(platformAccessPending.status, "linked"),
							isNull(platformAccessPending.linkedOrganizationId),
						),
					)
					.limit(1)
			)[0];

	if (
		!pending?.dodoSubscriptionId ||
		(pending.planId !== "individual" && !isOrgBillingPlanId(pending.planId))
	) {
		return false;
	}

	if (pending.planId === "individual" && !args.isPersonalOrg) {
		return false;
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

	return true;
}

/** Apply partner trial from redemption onto a free workspace when eligible. */
async function copyActivePartnerTrialToOrgWithTx(
	tx: PlatformAccessTx,
	args: {
		creatorWallet: Address;
		organizationId: string;
	},
): Promise<boolean> {
	const wallet = getAddress(args.creatorWallet);
	const now = new Date();

	const [orgSub] = await tx
		.select({
			planId: organizationSubscriptions.planId,
			status: organizationSubscriptions.status,
			provider: organizationSubscriptions.provider,
			periodStart: organizationSubscriptions.periodStart,
			periodEnd: organizationSubscriptions.periodEnd,
			featureOverrides: organizationSubscriptions.featureOverrides,
		})
		.from(organizationSubscriptions)
		.where(eq(organizationSubscriptions.organizationId, args.organizationId))
		.limit(1);

	if (
		isActivePartnerTrialSubscription(
			orgSub
				? {
						...orgSub,
						featureOverrides:
							(orgSub.featureOverrides as Record<string, unknown> | null) ?? {},
					}
				: undefined,
			now,
		)
	) {
		return true;
	}

	if (!orgSub || orgSub.planId !== "free") {
		return false;
	}

	const [redemption] = await tx
		.select({
			planId: platformInvites.planId,
			trialDays: platformInvites.trialDays,
			featureOverrides: platformInvites.featureOverrides,
			kind: platformInvites.kind,
		})
		.from(platformInviteRedemptions)
		.innerJoin(
			platformInvites,
			eq(platformInviteRedemptions.inviteId, platformInvites.id),
		)
		.where(
			and(
				eq(platformInviteRedemptions.walletAddress, wallet),
				eq(platformInvites.kind, "partner_trial"),
			),
		)
		.limit(1);

	if (!redemption || !isOrgBillingPlanId(redemption.planId)) {
		return false;
	}

	const periodStart = new Date();
	const periodEnd = new Date(periodStart);
	periodEnd.setDate(periodEnd.getDate() + redemption.trialDays);

	await tx
		.update(organizationSubscriptions)
		.set({
			planId: redemption.planId,
			seatCount: 1,
			status: "trialing",
			provider: "manual",
			periodStart,
			periodEnd,
			featureOverrides: redemption.featureOverrides ?? {},
			updatedAt: now,
		})
		.where(
			and(
				eq(organizationSubscriptions.organizationId, args.organizationId),
				eq(organizationSubscriptions.planId, "free"),
			),
		);

	return true;
}

/** Apply partner trial from redemption onto a newly created workspace. */
export async function attachPartnerTrialOnOrgCreateWithTx(
	tx: PlatformAccessTx,
	args: {
		creatorWallet: Address;
		organizationId: string;
	},
): Promise<void> {
	await copyActivePartnerTrialToOrgWithTx(tx, args);
}

/** Attach partner trial to an existing workspace the user owns. Rolls back when attach is required but fails. */
export async function attachPartnerTrialToExistingOrgWithTx(
	tx: PlatformAccessTx,
	args: {
		creatorWallet: Address;
		organizationId: string;
		requireAttach: boolean;
	},
): Promise<boolean> {
	const attached = await copyActivePartnerTrialToOrgWithTx(tx, {
		creatorWallet: args.creatorWallet,
		organizationId: args.organizationId,
	});

	if (args.requireAttach && !attached) {
		throwAppError("WORKSPACE.PLATFORM_INVITE_PAID_PLAN_BLOCKS");
	}

	return attached;
}

export type PartnerInviteTrialContext = {
	active: true;
	planId: "teams" | "teams_pro";
	planName: string;
	trialDays: number;
	periodEnd: string | null;
};

/** Active partner-invite trial on a workspace (for welcome UX and billing context). */
export async function resolvePartnerInviteTrialForWorkspace(args: {
	wallet: Address;
	organizationId: string;
}): Promise<PartnerInviteTrialContext | null> {
	const wallet = getAddress(args.wallet);
	const now = new Date();

	const [redemption] = await db
		.select({ trialDays: platformInvites.trialDays })
		.from(platformInviteRedemptions)
		.innerJoin(
			platformInvites,
			eq(platformInviteRedemptions.inviteId, platformInvites.id),
		)
		.where(
			and(
				eq(platformInviteRedemptions.walletAddress, wallet),
				eq(platformInvites.kind, "partner_trial"),
			),
		)
		.limit(1);

	if (!redemption) {
		return null;
	}

	const [orgSub] = await db
		.select({
			planId: organizationSubscriptions.planId,
			status: organizationSubscriptions.status,
			provider: organizationSubscriptions.provider,
			periodStart: organizationSubscriptions.periodStart,
			periodEnd: organizationSubscriptions.periodEnd,
			featureOverrides: organizationSubscriptions.featureOverrides,
		})
		.from(organizationSubscriptions)
		.where(eq(organizationSubscriptions.organizationId, args.organizationId))
		.limit(1);

	if (
		!isActivePartnerTrialSubscription(
			orgSub
				? {
						...orgSub,
						featureOverrides:
							(orgSub.featureOverrides as Record<string, unknown> | null) ?? {},
					}
				: undefined,
			now,
		)
	) {
		return null;
	}

	const planId = orgSub.planId as "teams" | "teams_pro";

	return {
		active: true,
		planId,
		planName: getPlanName(planId as PlanId),
		trialDays: redemption.trialDays,
		periodEnd: orgSub.periodEnd?.toISOString() ?? null,
	};
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
	if (!serverSignupPolicyIsGated()) return;

	const walletNorm = getAddress(wallet);
	if (!(await isUserRegistered(walletNorm))) {
		throwAppError("WORKSPACE.PLATFORM_INVITE_REQUIRED", {
			params: { reason: "Complete account setup to continue" },
		});
	}
}
