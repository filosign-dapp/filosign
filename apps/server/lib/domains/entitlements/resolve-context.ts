import {
	DEFAULT_PLAN_ID,
	type EntitlementContext,
	type FeatureKey,
	type PlanId,
} from "@filosign/entitlements";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import db from "@/lib/platform/db";
import { userSubscriptions } from "@/lib/platform/db/schema/billing";
import { files } from "@/lib/platform/db/schema/file";
import { organizationSubscriptions } from "@/lib/platform/db/schema/organization";
import { calendarMonthPeriod } from "./calendar-month";

export async function resolveEntitlementContext(
	wallet: Address,
	organizationId?: string | null,
): Promise<EntitlementContext> {
	const walletNorm = getAddress(wallet);
	const { periodStart, periodEnd } = calendarMonthPeriod();

	if (organizationId) {
		const [orgSub] = await db
			.select({
				planId: organizationSubscriptions.planId,
				featureOverrides: organizationSubscriptions.featureOverrides,
			})
			.from(organizationSubscriptions)
			.where(eq(organizationSubscriptions.organizationId, organizationId))
			.limit(1);

		const planId: PlanId =
			(orgSub?.planId as PlanId | undefined) ?? DEFAULT_PLAN_ID;
		const overrides =
			(orgSub?.featureOverrides as EntitlementContext["overrides"]) ??
			undefined;

		const [{ count }] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(files)
			.where(
				and(
					eq(files.organizationId, organizationId),
					gte(files.createdAt, periodStart),
					lt(files.createdAt, periodEnd),
				),
			);

		return {
			subject: {
				type: "org_member",
				orgId: organizationId,
				wallet: walletNorm,
			},
			planId,
			periodStart,
			usage: { "documents.sent.monthly": count ?? 0 },
			overrides,
		};
	}

	const [sub] = await db
		.select({
			planId: userSubscriptions.planId,
			featureOverrides: userSubscriptions.featureOverrides,
		})
		.from(userSubscriptions)
		.where(eq(userSubscriptions.walletAddress, walletNorm))
		.limit(1);

	const planId: PlanId = sub?.planId ?? DEFAULT_PLAN_ID;
	const overrides = sub?.featureOverrides ?? undefined;

	const [{ count }] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(files)
		.where(
			and(
				eq(files.sender, walletNorm),
				gte(files.createdAt, periodStart),
				lt(files.createdAt, periodEnd),
			),
		);

	const usage: Partial<Record<FeatureKey, number>> = {
		"documents.sent.monthly": count ?? 0,
	};

	return {
		subject: { type: "user", wallet: walletNorm },
		planId,
		periodStart,
		usage,
		overrides,
	};
}
