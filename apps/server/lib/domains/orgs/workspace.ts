import type { PlanId } from "@filosign/entitlements";
import { throwAppError } from "@filosign/errors/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { isWorkspaceBillingPlanId } from "@/lib/domains/billing/utils/policy";
import { effectivePlanIdFromStatus } from "@/lib/domains/entitlements";
import db from "@/lib/platform/db";
import {
	organizationMembers,
	organizations,
} from "@/lib/platform/db/schema/organization";
import { platformAccessPending } from "@/lib/platform/db/schema/platform-access";

type OrgDbClient = Pick<typeof db, "select">;
type OrgDbTx = Pick<typeof db, "select" | "update">;

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
	client: OrgDbClient = db,
): Promise<string | null> {
	const walletNorm = getAddress(wallet);
	const [row] = await client
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

export async function assertUserOwnsOrganization(
	wallet: Address,
	organizationId: string,
	client: OrgDbClient = db,
): Promise<void> {
	const walletNorm = getAddress(wallet);
	const [row] = await client
		.select({ organizationId: organizationMembers.organizationId })
		.from(organizationMembers)
		.where(
			and(
				eq(organizationMembers.organizationId, organizationId),
				eq(organizationMembers.walletAddress, walletNorm),
				eq(organizationMembers.role, "owner"),
				eq(organizationMembers.status, "active"),
			),
		)
		.limit(1);

	if (!row) {
		throwAppError("WORKSPACE.NOT_MEMBER");
	}
}

export function assertPaidPlanPendingForAdditionalOrg(args: {
	ownedCountBeforeCreate: number;
	pendingBillingId?: string | null;
}): void {
	if (args.ownedCountBeforeCreate === 0) return;
	if (!args.pendingBillingId?.trim()) {
		throwAppError("WORKSPACE.PAID_PLAN_REQUIRED");
	}
}

export function assertOrgSubscriptionIsPaidAfterAttach(args: {
	ownedCountBeforeCreate: number;
	planId: PlanId;
	status: string;
	cancelAtPeriodEnd: boolean;
	periodEnd: Date | null;
}): void {
	if (args.ownedCountBeforeCreate === 0) return;

	const effective = effectivePlanIdFromStatus({
		planId: args.planId,
		status: args.status,
		cancelAtPeriodEnd: args.cancelAtPeriodEnd,
		periodEnd: args.periodEnd,
	});

	if (!isWorkspaceBillingPlanId(effective) || effective === "individual") {
		throwAppError("WORKSPACE.PAID_PLAN_REQUIRED");
	}
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

export async function loadValidatedPendingBillingForCreate(
	tx: OrgDbTx,
	args: {
		wallet: Address;
		pendingBillingId: string;
	},
) {
	const walletNorm = getAddress(args.wallet);
	const [pending] = await tx
		.select()
		.from(platformAccessPending)
		.where(
			and(
				eq(platformAccessPending.id, args.pendingBillingId),
				eq(platformAccessPending.linkedWallet, walletNorm),
				eq(platformAccessPending.status, "linked"),
				isNull(platformAccessPending.linkedOrganizationId),
			),
		)
		.limit(1);

	if (!pending?.dodoSubscriptionId) {
		throwAppError("WORKSPACE.PAID_PLAN_REQUIRED");
	}

	if (
		pending.planId === "individual" ||
		!isWorkspaceBillingPlanId(pending.planId)
	) {
		throwAppError("WORKSPACE.PAID_PLAN_REQUIRED");
	}

	if (pending.expiresAt.getTime() <= Date.now()) {
		throwAppError("WORKSPACE.PAID_PLAN_REQUIRED");
	}

	return pending;
}
