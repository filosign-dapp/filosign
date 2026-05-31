import type {
	EntitlementContext,
	FeatureKey,
	PlanId,
} from "@filosign/entitlements";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import db from "@/lib/platform/db";
import { userSubscriptions } from "@/lib/platform/db/schema/billing";
import { files } from "@/lib/platform/db/schema/file";
import { organizationSubscriptions } from "@/lib/platform/db/schema/organization";
import { calendarMonthPeriod } from "./calendar-month";
import { effectivePlanIdFromStatus } from "./effective-plan";

export async function resolveEntitlementContext(
	wallet: Address,
	organizationId?: string | null,
): Promise<EntitlementContext> {
	const walletNorm = getAddress(wallet);
	const { periodStart, periodEnd } = calendarMonthPeriod();

	// 1. Fetch user's subscription
	const [sub] = await db
		.select({
			planId: userSubscriptions.planId,
			status: userSubscriptions.status,
			cancelAtPeriodEnd: userSubscriptions.cancelAtPeriodEnd,
			periodEnd: userSubscriptions.periodEnd,
			featureOverrides: userSubscriptions.featureOverrides,
		})
		.from(userSubscriptions)
		.where(eq(userSubscriptions.walletAddress, walletNorm))
		.limit(1);

	const userAccessInput = sub
		? {
				planId: sub.planId as PlanId,
				status: sub.status,
				cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
				periodEnd: sub.periodEnd,
			}
		: undefined;
	const userPlanId = effectivePlanIdFromStatus(userAccessInput);
	const userOverrides =
		sub && userPlanId === (sub.planId as PlanId) && userPlanId !== "free"
			? sub.featureOverrides
			: undefined;

	let planId: PlanId = userPlanId;
	let overrides = userOverrides;
	let subject: EntitlementContext["subject"] = {
		type: "user",
		wallet: walletNorm,
	};

	// 2. Fetch organization's subscription if organizationId is present
	let seatCount: number | undefined;
	if (organizationId) {
		const [orgSub] = await db
			.select({
				planId: organizationSubscriptions.planId,
				status: organizationSubscriptions.status,
				seatCount: organizationSubscriptions.seatCount,
				cancelAtPeriodEnd: organizationSubscriptions.cancelAtPeriodEnd,
				periodEnd: organizationSubscriptions.periodEnd,
				featureOverrides: organizationSubscriptions.featureOverrides,
			})
			.from(organizationSubscriptions)
			.where(eq(organizationSubscriptions.organizationId, organizationId))
			.limit(1);

		const orgAccessInput = orgSub
			? {
					planId: orgSub.planId as PlanId,
					status: orgSub.status,
					cancelAtPeriodEnd: orgSub.cancelAtPeriodEnd,
					periodEnd: orgSub.periodEnd,
				}
			: undefined;
		const orgPlanId: PlanId = effectivePlanIdFromStatus(orgAccessInput);
		const orgOverrides =
			orgSub && orgPlanId === (orgSub.planId as PlanId) && orgPlanId !== "free"
				? (orgSub.featureOverrides as EntitlementContext["overrides"])
				: undefined;

		planId = orgPlanId;
		overrides = orgOverrides;

		if (
			planId === "teams" ||
			planId === "teams_pro" ||
			planId === "individual"
		) {
			seatCount = planId === "individual" ? 1 : (orgSub?.seatCount ?? 1);
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
		planId,
		periodStart,
		usage,
		overrides,
		seatCount,
	};
}
