import { getPlanName, type PlanId } from "@filosign/entitlements";
import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { subscriptionAccessFromRow } from "@/lib/domains/billing/plan-transitions";
import db from "@/lib/platform/db";
import {
	type SubscriptionStatus,
	userSubscriptions,
} from "@/lib/platform/db/schema/billing";

export async function getUserBillingSummary(wallet: Address) {
	const walletNorm = getAddress(wallet);
	const [sub] = await db
		.select()
		.from(userSubscriptions)
		.where(eq(userSubscriptions.walletAddress, walletNorm))
		.limit(1);

	const rawPlanId = (sub?.planId ?? "free") as PlanId;
	const planId = subscriptionAccessFromRow({
		planId: rawPlanId,
		status: (sub?.status ?? "active") as SubscriptionStatus,
		cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
		periodEnd: sub?.periodEnd ?? null,
	});

	return {
		planId,
		planName: getPlanName(planId),
		status: sub?.status ?? "active",
		provider: sub?.provider ?? "manual",
		billingInterval: null as "monthly" | "yearly" | null,
		periodStart: sub?.periodStart?.toISOString() ?? null,
		periodEnd: sub?.periodEnd?.toISOString() ?? null,
		cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
		hasDodoSubscription: Boolean(sub?.dodoSubscriptionId),
	};
}
