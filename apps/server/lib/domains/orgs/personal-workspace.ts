import type { PlanId } from "@filosign/entitlements";
import { ORPCError } from "@orpc/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { isWorkspaceBillingPlanId } from "@/lib/domains/billing/policy";
import { effectivePlanIdFromStatus } from "@/lib/domains/entitlements/effective-plan";
import db from "@/lib/platform/db";
import { userSubscriptions } from "@/lib/platform/db/schema/billing";
import {
	organizationMembers,
	organizationSubscriptions,
	organizations,
} from "@/lib/platform/db/schema/organization";

const TEAM_PLANS = ["teams", "teams_pro"] as const satisfies PlanId[];

export async function countOwnedOrganizations(
	wallet: Address,
): Promise<number> {
	const walletNorm = getAddress(wallet);
	const [row] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(organizationMembers)
		.innerJoin(
			organizations,
			eq(organizations.id, organizationMembers.organizationId),
		)
		.where(
			and(
				eq(organizationMembers.walletAddress, walletNorm),
				eq(organizationMembers.role, "owner"),
				eq(organizationMembers.status, "active"),
			),
		);
	return row?.count ?? 0;
}

export async function getPersonalOrganizationId(
	wallet: Address,
): Promise<string | null> {
	const walletNorm = getAddress(wallet);
	const [row] = await db
		.select({ organizationId: organizations.id })
		.from(organizationMembers)
		.innerJoin(
			organizations,
			eq(organizations.id, organizationMembers.organizationId),
		)
		.where(
			and(
				eq(organizationMembers.walletAddress, walletNorm),
				eq(organizationMembers.role, "owner"),
				eq(organizationMembers.status, "active"),
				eq(organizations.isPersonal, true),
			),
		)
		.limit(1);
	return row?.organizationId ?? null;
}

export async function userCanCreateAdditionalWorkspaces(
	wallet: Address,
): Promise<boolean> {
	const walletNorm = getAddress(wallet);
	const rows = await db
		.select({
			planId: organizationSubscriptions.planId,
			status: organizationSubscriptions.status,
			cancelAtPeriodEnd: organizationSubscriptions.cancelAtPeriodEnd,
			periodEnd: organizationSubscriptions.periodEnd,
		})
		.from(organizationMembers)
		.innerJoin(
			organizationSubscriptions,
			eq(
				organizationSubscriptions.organizationId,
				organizationMembers.organizationId,
			),
		)
		.where(
			and(
				eq(organizationMembers.walletAddress, walletNorm),
				eq(organizationMembers.role, "owner"),
				eq(organizationMembers.status, "active"),
				inArray(organizationSubscriptions.planId, [...TEAM_PLANS]),
			),
		);

	for (const row of rows) {
		const effective = effectivePlanIdFromStatus({
			planId: row.planId as PlanId,
			status: row.status,
			cancelAtPeriodEnd: row.cancelAtPeriodEnd,
			periodEnd: row.periodEnd,
		});
		if (effective === "teams" || effective === "teams_pro") {
			return true;
		}
	}
	return false;
}

export async function assertCanCreateAdditionalWorkspace(
	wallet: Address,
): Promise<void> {
	const owned = await countOwnedOrganizations(wallet);
	if (owned === 0) return;

	if (await userCanCreateAdditionalWorkspaces(wallet)) {
		return;
	}

	throw new ORPCError("FORBIDDEN", {
		message:
			"Additional workspaces require Teams or Teams Pro. Upgrade your workspace, then create another.",
		data: { code: "WORKSPACE_LIMIT" },
	});
}

/** Move legacy wallet-level Solo onto the personal workspace org subscription. */
export async function migrateLegacyWalletBillingToPersonalOrg(
	wallet: Address,
): Promise<void> {
	const walletNorm = getAddress(wallet);
	const personalOrgId = await getPersonalOrganizationId(walletNorm);
	if (!personalOrgId) return;

	const [walletSub] = await db
		.select()
		.from(userSubscriptions)
		.where(eq(userSubscriptions.walletAddress, walletNorm))
		.limit(1);

	if (!walletSub || walletSub.planId !== "individual") return;

	const walletActive =
		effectivePlanIdFromStatus({
			planId: walletSub.planId as PlanId,
			status: walletSub.status,
			cancelAtPeriodEnd: walletSub.cancelAtPeriodEnd,
			periodEnd: walletSub.periodEnd,
		}) === "individual";

	if (!walletActive) return;

	const [orgSub] = await db
		.select()
		.from(organizationSubscriptions)
		.where(eq(organizationSubscriptions.organizationId, personalOrgId))
		.limit(1);

	const orgEffective = orgSub
		? effectivePlanIdFromStatus({
				planId: orgSub.planId as PlanId,
				status: orgSub.status,
				cancelAtPeriodEnd: orgSub.cancelAtPeriodEnd,
				periodEnd: orgSub.periodEnd,
			})
		: "free";

	if (
		orgEffective === "teams" ||
		orgEffective === "teams_pro" ||
		orgEffective === "individual"
	) {
		await db
			.update(userSubscriptions)
			.set({
				planId: "free",
				status: "active",
				provider: "manual",
				dodoSubscriptionId: null,
				dodoCustomerId: null,
				updatedAt: new Date(),
			})
			.where(eq(userSubscriptions.walletAddress, walletNorm));
		return;
	}

	await db
		.update(organizationSubscriptions)
		.set({
			planId: "individual",
			seatCount: 1,
			status: walletSub.status,
			provider: walletSub.provider,
			periodStart: walletSub.periodStart,
			periodEnd: walletSub.periodEnd,
			cancelAtPeriodEnd: walletSub.cancelAtPeriodEnd,
			dodoCustomerId: walletSub.dodoCustomerId,
			dodoSubscriptionId: walletSub.dodoSubscriptionId,
			updatedAt: new Date(),
		})
		.where(eq(organizationSubscriptions.organizationId, personalOrgId));

	await db
		.update(userSubscriptions)
		.set({
			planId: "free",
			status: "active",
			provider: "manual",
			dodoSubscriptionId: null,
			dodoCustomerId: null,
			updatedAt: new Date(),
		})
		.where(eq(userSubscriptions.walletAddress, walletNorm));
}

export function resolveIsPersonalForNewOrganization(
	ownedCountBeforeCreate: number,
): boolean {
	return ownedCountBeforeCreate === 0;
}

export function assertSeatCountForPlan(planId: PlanId, seatCount: number) {
	if (planId === "individual" && seatCount !== 1) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Solo plan supports exactly one seat",
		});
	}
}

export function isPaidWorkspacePlan(planId: PlanId): boolean {
	return isWorkspaceBillingPlanId(planId);
}
