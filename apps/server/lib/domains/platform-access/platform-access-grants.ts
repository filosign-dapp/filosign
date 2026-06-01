import type { PlanId } from "@filosign/entitlements";
import { and, eq, isNotNull, lt, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { shouldAutoGrantTeamsProForAdminEmail } from "@/lib/platform/admin";
import db from "@/lib/platform/db";
import { userSubscriptions } from "@/lib/platform/db/schema/billing";
import {
	organizationMembers,
	organizationSubscriptions,
} from "@/lib/platform/db/schema/organization";
import {
	checkoutIntents,
	platformAccessPending,
} from "@/lib/platform/db/schema/platform-access";
import { users } from "@/lib/platform/db/schema/user";
import { setUserPlanManual } from "./platform-access-invites";
import { normalizeEmail, type PlatformAccessTx } from "./utils/shared";

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
