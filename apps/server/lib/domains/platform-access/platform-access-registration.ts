import { signupPolicyIsGated } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import env from "@/env";
import { isOrgBillingPlanId } from "@/lib/domains/billing/policy";
import db from "@/lib/platform/db";
import { userSubscriptions } from "@/lib/platform/db/schema/billing";
import { organizationSubscriptions } from "@/lib/platform/db/schema/organization";
import {
	platformAccessPending,
	platformInviteRedemptions,
	platformInvites,
} from "@/lib/platform/db/schema/platform-access";
import { isUserRegistered } from "./user-exists";
import {
	inviteIsActive,
	normalizeEmail,
	type PlatformAccessTx,
} from "./utils/shared";

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
	if (!(await isUserRegistered(walletNorm))) {
		throw new ORPCError("FORBIDDEN", {
			message: "Complete account setup to continue",
			data: { code: "INVITE_REQUIRED" },
		});
	}
}

/** @deprecated Use {@link assertRegistrationComplete}. */
export const assertPlatformAccess = assertRegistrationComplete;
