import { getPlanName, PLAN_IDS, type PlanId } from "@filosign/entitlements";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import env from "@/env";
import { effectivePlanIdFromStatus } from "@/lib/domains/entitlements";
import db from "@/lib/platform/db";
import {
	organizationMembers,
	organizationSubscriptions,
} from "@/lib/platform/db/schema/organization";
import { users } from "@/lib/platform/db/schema/user";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";
import type { BillingInterval } from "../billing";
import { isOrgBillingPlanId, isWorkspaceBillingPlanId } from "./policy";

export type CheckoutPlanId = "individual" | "teams" | "teams_pro";

export type MarketingCheckoutPreview =
	| { action: "send_link" }
	| { action: "sign_in"; message: string; clientUrl: string }
	| {
			action: "already_subscribed";
			message: string;
			currentPlan: PlanId;
			currentPlanName: string;
			suggestedPlans: CheckoutPlanId[];
			comparePlansUrl: string;
			clientUrl: string;
	  }
	| {
			action: "use_in_app";
			message: string;
			deepLink: "workspace";
			clientUrl: string;
	  };

export type MarketingSubscriberState = {
	hasUser: boolean;
	walletPlanId: PlanId;
	orgPlanId: PlanId | null;
	hasActiveSolo: boolean;
	hasActiveOrgPlan: boolean;
	matchingOrgPlan: PlanId | null;
};

function planTier(planId: PlanId): number {
	const idx = (PLAN_IDS as readonly string[]).indexOf(planId);
	return idx < 0 ? 0 : idx;
}

function isPaidWorkspacePlan(planId: PlanId): boolean {
	return isWorkspaceBillingPlanId(planId);
}

export function resolveMarketingCheckoutPreview(args: {
	requestedPlanId: CheckoutPlanId;
	subscriber: MarketingSubscriberState;
	clientUrl: string;
	astroUrl: string;
}): MarketingCheckoutPreview {
	const comparePlansUrl = `${args.astroUrl.replace(/\/$/, "")}/pricing`;
	const clientUrl = args.clientUrl.replace(/\/$/, "");

	if (!args.subscriber.hasUser) {
		return { action: "send_link" };
	}

	const { requestedPlanId, subscriber } = args;

	if (requestedPlanId === "individual" && subscriber.hasActiveSolo) {
		return {
			action: "already_subscribed",
			message:
				"You already have Solo on a workspace. Sign in to manage billing or upgrade to Teams.",
			currentPlan: "individual",
			currentPlanName: getPlanName("individual"),
			suggestedPlans: ["teams", "teams_pro"],
			comparePlansUrl,
			clientUrl,
		};
	}

	if (
		isOrgBillingPlanId(requestedPlanId) &&
		subscriber.matchingOrgPlan === requestedPlanId &&
		subscriber.hasActiveOrgPlan
	) {
		return {
			action: "use_in_app",
			message: `You already have ${getPlanName(requestedPlanId)} on a workspace. Sign in to manage billing and seats.`,
			deepLink: "workspace",
			clientUrl,
		};
	}

	if (
		isOrgBillingPlanId(requestedPlanId) &&
		subscriber.hasActiveOrgPlan &&
		subscriber.matchingOrgPlan &&
		planTier(subscriber.matchingOrgPlan) >= planTier(requestedPlanId)
	) {
		return {
			action: "use_in_app",
			message: `Your account already includes ${getPlanName(subscriber.matchingOrgPlan)} workspace billing. Sign in to manage your subscription.`,
			deepLink: "workspace",
			clientUrl,
		};
	}

	if (
		requestedPlanId === "individual" &&
		subscriber.hasActiveOrgPlan &&
		subscriber.matchingOrgPlan &&
		isPaidWorkspacePlan(subscriber.matchingOrgPlan)
	) {
		return {
			action: "use_in_app",
			message: `Your workspace is on ${getPlanName(subscriber.matchingOrgPlan)}. Sign in to manage billing — a separate Solo plan is not required.`,
			deepLink: "workspace",
			clientUrl,
		};
	}

	if (
		isOrgBillingPlanId(requestedPlanId) &&
		subscriber.hasActiveSolo &&
		!subscriber.hasActiveOrgPlan
	) {
		return { action: "send_link" };
	}

	if (
		subscriber.hasUser &&
		(subscriber.hasActiveSolo || subscriber.hasActiveOrgPlan)
	) {
		if (requestedPlanId === "individual" && !subscriber.hasActiveSolo) {
			return { action: "send_link" };
		}
		if (isOrgBillingPlanId(requestedPlanId)) {
			return {
				action: "sign_in",
				message:
					"This email is already registered. Sign in to upgrade your workspace or manage billing.",
				clientUrl,
			};
		}
	}

	return { action: "send_link" };
}

export function subscriptionAccessFromRow(row: {
	planId: string;
	status: string;
	cancelAtPeriodEnd: boolean;
	periodEnd: Date | null;
}): PlanId {
	return effectivePlanIdFromStatus({
		planId: row.planId as PlanId,
		status: row.status,
		cancelAtPeriodEnd: row.cancelAtPeriodEnd,
		periodEnd: row.periodEnd,
	});
}

export function isActivePaidPlan(planId: PlanId): boolean {
	return planId !== "free" && planId !== "enterprise";
}

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
		throw throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					path: ["email"],
					message: "Email is required",
				},
			]),
		);
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
		throw throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					path: ["email"],
					message,
				},
			]),
		);
	}
}
