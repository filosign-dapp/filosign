import {
	DEFAULT_PLAN_ID,
	type EntitlementContext,
	type FeatureKey,
	PLAN_IDS,
	type PlanId,
} from "@filosign/entitlements";
import { devEntitlementsBypass } from "@filosign/shared";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import env from "@/env";
import db from "@/lib/platform/db";
import { userSubscriptions } from "@/lib/platform/db/schema/billing";
import { files } from "@/lib/platform/db/schema/file";
import { organizationSubscriptions } from "@/lib/platform/db/schema/organization";
import { users } from "@/lib/platform/db/schema/user";
import { calendarMonthPeriod } from "./calendar-month";
import { effectivePlanIdFromStatus } from "./effective-plan";

export async function resolveEntitlementContext(
	wallet: Address,
	organizationId?: string | null,
): Promise<EntitlementContext> {
	const walletNorm = getAddress(wallet);
	const { periodStart, periodEnd } = calendarMonthPeriod();

	const [userRow] = await db
		.select({ email: users.email })
		.from(users)
		.where(eq(users.walletAddress, walletNorm))
		.limit(1);
	const devBypass = devEntitlementsBypass(env.DEPLOYMENT, userRow?.email);

	// 1. Fetch user's subscription
	const [sub] = await db
		.select({
			planId: userSubscriptions.planId,
			status: userSubscriptions.status,
			featureOverrides: userSubscriptions.featureOverrides,
		})
		.from(userSubscriptions)
		.where(eq(userSubscriptions.walletAddress, walletNorm))
		.limit(1);

	const userPlanId = effectivePlanIdFromStatus(
		sub ? { planId: sub.planId as PlanId, status: sub.status } : undefined,
	);
	const userOverrides =
		sub && (sub.status === "active" || sub.status === "trialing")
			? sub.featureOverrides
			: undefined;

	let planId: PlanId = userPlanId;
	let overrides = userOverrides;
	let subject: EntitlementContext["subject"] = {
		type: "user",
		wallet: walletNorm,
	};

	// 2. Fetch organization's subscription if organizationId is present
	if (organizationId) {
		const [orgSub] = await db
			.select({
				planId: organizationSubscriptions.planId,
				featureOverrides: organizationSubscriptions.featureOverrides,
			})
			.from(organizationSubscriptions)
			.where(eq(organizationSubscriptions.organizationId, organizationId))
			.limit(1);

		const orgPlanId: PlanId =
			(orgSub?.planId as PlanId | undefined) ?? DEFAULT_PLAN_ID;
		const orgOverrides =
			(orgSub?.featureOverrides as EntitlementContext["overrides"]) ??
			undefined;

		// Use whichever plan is higher/greater in PLAN_IDS hierarchy
		const userIndex = (PLAN_IDS as readonly string[]).indexOf(userPlanId);
		const orgIndex = (PLAN_IDS as readonly string[]).indexOf(orgPlanId);

		if (orgIndex > userIndex) {
			planId = orgPlanId;
			overrides = orgOverrides;
		} else {
			planId = userPlanId;
			overrides = userOverrides;
		}

		subject = {
			type: "org_member",
			orgId: organizationId,
			wallet: walletNorm,
		};
	}

	// 3. Count documents sent
	const [{ count }] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(files)
		.where(
			organizationId
				? and(
						eq(files.organizationId, organizationId),
						gte(files.createdAt, periodStart),
						lt(files.createdAt, periodEnd),
					)
				: and(
						eq(files.sender, walletNorm),
						gte(files.createdAt, periodStart),
						lt(files.createdAt, periodEnd),
					),
		);

	const usage: Partial<Record<FeatureKey, number>> = {
		"documents.sent.monthly": count ?? 0,
	};

	return {
		subject,
		planId: devBypass ? "enterprise" : planId,
		periodStart,
		usage,
		overrides,
		...(devBypass ? { bypass: true as const } : {}),
	};
}
