import type { PlanId } from "@filosign/entitlements";
import { throwAppError } from "@filosign/errors/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { isWorkspaceBillingPlanId } from "@/lib/domains/billing/utils/policy";
import { effectivePlanIdFromStatus } from "@/lib/domains/entitlements";
import db from "@/lib/platform/db";
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

	throw throwAppError("ENTITLEMENT.LIMIT_EXCEEDED");
}

export function resolveIsPersonalForNewOrganization(
	ownedCountBeforeCreate: number,
): boolean {
	return ownedCountBeforeCreate === 0;
}

export function assertSeatCountForPlan(planId: PlanId, seatCount: number) {
	if (planId === "individual" && seatCount !== 1) {
		throw throwAppError("ENTITLEMENT.LIMIT_EXCEEDED");
	}
}

export function isPaidWorkspacePlan(planId: PlanId): boolean {
	return isWorkspaceBillingPlanId(planId);
}
