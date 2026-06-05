import { throwAppError } from "@filosign/errors/server";
import { signupPolicyIsGated } from "@filosign/shared";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import env from "@/env";
import { isOrgBillingPlanId } from "@/lib/domains/billing/utils/policy";
import {
	CACHE_TTL,
	cacheAside,
	cacheKeys,
	defaultDeserialize,
	defaultSerialize,
} from "@/lib/platform/cache";
import db from "@/lib/platform/db";
import { userSubscriptions } from "@/lib/platform/db/schema/billing";
import { organizationSubscriptions } from "@/lib/platform/db/schema/organization";
import {
	platformAccessPending,
	platformInviteRedemptions,
	platformInvites,
} from "@/lib/platform/db/schema/platform-access";
import { users } from "@/lib/platform/db/schema/user";
import {
	inviteIsActive,
	normalizeEmail,
	type PlatformAccessTx,
} from "./utils/shared";

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
	if (!(await isUserRegistered(walletNorm))) {
		throwAppError("WORKSPACE.PLATFORM_INVITE_REQUIRED", {
			params: { reason: "Complete account setup to continue" },
		});
	}
}
