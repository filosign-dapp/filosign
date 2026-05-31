import type { PlanId } from "@filosign/entitlements";
import { ORPCError } from "@orpc/server";
import { and, eq, inArray } from "drizzle-orm";
import env from "@/env";
import type { BillingInterval } from "@/lib/domains/billing/billing";
import {
	type CheckoutPlanId,
	type MarketingCheckoutPreview,
	type MarketingSubscriberState,
	resolveMarketingCheckoutPreview,
	subscriptionAccessFromRow,
} from "@/lib/domains/billing/plan-transitions";
import { isWorkspaceBillingPlanId } from "@/lib/domains/billing/policy";
import db from "@/lib/platform/db";
import {
	organizationMembers,
	organizationSubscriptions,
} from "@/lib/platform/db/schema/organization";
import { users } from "@/lib/platform/db/schema/user";

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

async function loadSubscriberByEmail(
	email: string,
): Promise<MarketingSubscriberState> {
	const [user] = await db
		.select({ walletAddress: users.walletAddress })
		.from(users)
		.where(eq(users.email, email))
		.limit(1);

	if (!user) {
		return {
			hasUser: false,
			walletPlanId: "free",
			orgPlanId: null,
			hasActiveSolo: false,
			hasActiveOrgPlan: false,
			matchingOrgPlan: null,
		};
	}

	const adminMemberships = await db
		.select({
			organizationId: organizationMembers.organizationId,
		})
		.from(organizationMembers)
		.where(
			and(
				eq(organizationMembers.walletAddress, user.walletAddress),
				eq(organizationMembers.status, "active"),
				inArray(organizationMembers.role, ["owner", "admin"]),
			),
		);

	const orgIds = adminMemberships.map((m) => m.organizationId);
	let bestOrgPlan: PlanId = "free";
	let hasActiveSolo = false;

	if (orgIds.length > 0) {
		const orgSubs = await db
			.select()
			.from(organizationSubscriptions)
			.where(inArray(organizationSubscriptions.organizationId, orgIds));

		for (const orgSub of orgSubs) {
			const effective = subscriptionAccessFromRow({
				planId: orgSub.planId as PlanId,
				status: orgSub.status,
				cancelAtPeriodEnd: orgSub.cancelAtPeriodEnd,
				periodEnd: orgSub.periodEnd,
			});
			if (effective === "individual") {
				hasActiveSolo = true;
			}
			if (
				isWorkspaceBillingPlanId(effective) &&
				(bestOrgPlan === "free" ||
					planTierRank(effective) > planTierRank(bestOrgPlan))
			) {
				bestOrgPlan = effective;
			}
		}
	}

	const hasActiveOrgPlan =
		bestOrgPlan === "teams" || bestOrgPlan === "teams_pro";

	return {
		hasUser: true,
		walletPlanId: "free",
		orgPlanId: hasActiveSolo || hasActiveOrgPlan ? bestOrgPlan : null,
		hasActiveSolo,
		hasActiveOrgPlan,
		matchingOrgPlan: hasActiveSolo || hasActiveOrgPlan ? bestOrgPlan : null,
	};
}

function planTierRank(planId: PlanId): number {
	if (planId === "teams_pro") return 3;
	if (planId === "teams") return 2;
	if (planId === "individual") return 1;
	return 0;
}

export async function previewMarketingCheckout(args: {
	email: string;
	planId: CheckoutPlanId;
	interval: BillingInterval;
	seatCount?: number;
}): Promise<MarketingCheckoutPreview> {
	const email = normalizeEmail(args.email);
	if (!email) {
		throw new ORPCError("BAD_REQUEST", { message: "Email is required" });
	}

	const subscriber = await loadSubscriberByEmail(email);

	return resolveMarketingCheckoutPreview({
		requestedPlanId: args.planId,
		subscriber,
		clientUrl: env.CLIENT_URL,
		astroUrl: env.ASTRO_URL ?? env.CLIENT_URL,
	});
}

export async function assertMarketingCheckoutAllowed(args: {
	email: string;
	planId: CheckoutPlanId;
}): Promise<void> {
	const preview = await previewMarketingCheckout({
		email: args.email,
		planId: args.planId,
		interval: "monthly",
	});

	if (preview.action !== "send_link") {
		const message =
			preview.action === "already_subscribed"
				? preview.message
				: preview.message;
		throw new ORPCError("BAD_REQUEST", { message });
	}
}
