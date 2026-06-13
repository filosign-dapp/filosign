import { throwAppError } from "@filosign/errors/server";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import {
	organizationMembers,
	organizationSubscriptions,
} from "@/lib/platform/db/schema/organization";
import type { PlatformAccessTx } from "./shared";

export type PartnerTrialSubscriptionGuardRow = {
	planId: string;
	status: string;
	provider: string;
	periodEnd: Date | null;
	dodoSubscriptionId?: string | null;
};

export function isDodoBackedSubscription(row: {
	provider: string;
	dodoSubscriptionId?: string | null;
}): boolean {
	return row.provider === "dodo" || Boolean(row.dodoSubscriptionId?.trim());
}

export function canApplyPartnerTrialToUserSub(
	row: PartnerTrialSubscriptionGuardRow | undefined,
): boolean {
	if (!row) return true;
	return !isDodoBackedSubscription(row);
}

export function canApplyPartnerTrialToOrgSub(
	row: PartnerTrialSubscriptionGuardRow | undefined,
	now = new Date(),
): boolean {
	if (!row || row.planId === "free") return true;
	if (isDodoBackedSubscription(row)) return false;
	if (row.provider === "manual") {
		if (row.status === "canceled") return true;
		if (row.periodEnd && row.periodEnd.getTime() <= now.getTime()) return true;
	}
	return false;
}

export async function assertNoOwnedActiveDodoSubscriptions(
	tx: PlatformAccessTx,
	wallet: Address,
): Promise<void> {
	const walletNorm = getAddress(wallet);
	const rows = await tx
		.select({ organizationId: organizationSubscriptions.organizationId })
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
				eq(organizationSubscriptions.provider, "dodo"),
				eq(organizationSubscriptions.status, "active"),
			),
		)
		.limit(1);

	if (rows.length > 0) {
		throwAppError("WORKSPACE.PLATFORM_INVITE_PAID_PLAN_BLOCKS");
	}
}
