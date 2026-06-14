import type { PlanId } from "@filosign/entitlements";
import { and, eq, isNotNull, lt, sql } from "drizzle-orm";
import { shouldAutoGrantTeamsProForAdminEmail } from "@/lib/platform/admin";
import { invalidateOrgEntitlements } from "@/lib/platform/cache";
import db from "@/lib/platform/db";
import {
	organizationMembers,
	organizationSubscriptions,
} from "@/lib/platform/db/schema/organization";
import {
	checkoutIntents,
	platformAccessPending,
} from "@/lib/platform/db/schema/platform-access";
import { users } from "@/lib/platform/db/schema/user";
import { normalizeEmail, type PlatformAccessTx } from "./utils/shared";

/** Callers must `invalidateOrgEntitlements(organizationId)` after the surrounding transaction commits. */
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
	orgGrants: number;
}> {
	const emailNorm = normalizeEmail(email);
	if (!shouldAutoGrantTeamsProForAdminEmail(emailNorm)) {
		return { orgGrants: 0 };
	}

	const [userRow] = await db
		.select({ walletAddress: users.walletAddress })
		.from(users)
		.where(eq(sql`lower(${users.email})`, emailNorm))
		.limit(1);

	if (!userRow) {
		return { orgGrants: 0 };
	}

	const orgRows = await db
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
		);

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
		await invalidateOrgEntitlements(row.organizationId);
		orgGrants += 1;
	}

	return { orgGrants };
}

export async function expirePartnerTrialsJob(): Promise<{ expired: number }> {
	const now = new Date();
	const orgManualTrialExpiry = and(
		eq(organizationSubscriptions.status, "trialing"),
		eq(organizationSubscriptions.provider, "manual"),
		isNotNull(organizationSubscriptions.periodEnd),
		lt(organizationSubscriptions.periodEnd, now),
	);

	const orgRows = await db
		.select({
			organizationId: organizationSubscriptions.organizationId,
		})
		.from(organizationSubscriptions)
		.where(orgManualTrialExpiry);

	if (orgRows.length === 0) {
		return { expired: 0 };
	}

	await db
		.update(organizationSubscriptions)
		.set({ status: "canceled", updatedAt: now })
		.where(orgManualTrialExpiry);

	await Promise.all(
		orgRows.map((row) => invalidateOrgEntitlements(row.organizationId)),
	);

	return { expired: orgRows.length };
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
