import type { PlanId } from "@filosign/entitlements";
import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import env from "@/env";
import { resolveEntitlementContext } from "@/lib/domains/entitlements";
import { resolvePartnerInviteTrialForWorkspace } from "@/lib/domains/platform-access/registration";
import db from "@/lib/platform/db";
import type { SubscriptionPlanId } from "@/lib/platform/db/schema/billing";
import { organizations } from "@/lib/platform/db/schema/organization";
import { getOrgBillingSummary } from "./utils/org";
import {
	buildUpgradeOfferings,
	buildWorkspaceAllowedActions,
	type UpgradeLimitReason,
} from "./utils/plans";
import { isDodoLiveMode } from "./utils/policy";

export type BillingInterval = "monthly" | "yearly";

const CHECKOUT_PLAN_IDS = [
	"individual",
	"teams",
	"teams_pro",
] as const satisfies SubscriptionPlanId[];

type CheckoutPlanId = (typeof CHECKOUT_PLAN_IDS)[number];

const DODO_TEST_PLAN_PRODUCT_IDS: Record<CheckoutPlanId, string> = {
	individual: "pdt_0NfmyRtNYwE5g8OYgkbL3",
	teams: "pdt_0NfmymopLpOgIv1IRallv",
	teams_pro: "pdt_0Nfmz3zlE8nPXI2lthZ9w",
};

const DODO_TEST_PLAN_PRODUCT_IDS_YEARLY: Record<CheckoutPlanId, string> = {
	individual: "pdt_0NfmyWM4nN9jYCspf5Scl",
	teams: "pdt_0NfmytI1yAAbhFZQEtUgK",
	teams_pro: "pdt_0Nfmz9m978R3nH8g6DL3y",
};

const DODO_LIVE_PLAN_PRODUCT_IDS: Record<CheckoutPlanId, string> = {
	individual: "pdt_0NfmPizJ6Qed3qp9tEeim",
	teams: "pdt_0NfmPufibqNnTIXEIbszF",
	teams_pro: "pdt_0NfmQBAAvXDqYiqWSz79B",
};

const DODO_LIVE_PLAN_PRODUCT_IDS_YEARLY: Record<CheckoutPlanId, string> = {
	individual: "pdt_0NfmfWinEiPodeNWGQ3ul",
	teams: "pdt_0NfmfhPh81Fgklfe8WgQz",
	teams_pro: "pdt_0Nfmg1rLmulqhqBBM2KHW",
};

export function resolveProductId(
	planId: CheckoutPlanId,
	interval: BillingInterval,
) {
	if (interval === "yearly") {
		if (planId === "individual" && env.DODO_PRODUCT_ID_INDIVIDUAL_YEARLY) {
			return env.DODO_PRODUCT_ID_INDIVIDUAL_YEARLY;
		}
		if (planId === "teams" && env.DODO_PRODUCT_ID_TEAMS_YEARLY) {
			return env.DODO_PRODUCT_ID_TEAMS_YEARLY;
		}
		if (planId === "teams_pro" && env.DODO_PRODUCT_ID_TEAMS_PRO_YEARLY) {
			return env.DODO_PRODUCT_ID_TEAMS_PRO_YEARLY;
		}
		return isDodoLiveMode()
			? DODO_LIVE_PLAN_PRODUCT_IDS_YEARLY[planId]
			: DODO_TEST_PLAN_PRODUCT_IDS_YEARLY[planId];
	}
	if (planId === "individual" && env.DODO_PRODUCT_ID_INDIVIDUAL_MONTHLY) {
		return env.DODO_PRODUCT_ID_INDIVIDUAL_MONTHLY;
	}
	if (planId === "teams" && env.DODO_PRODUCT_ID_TEAMS_MONTHLY) {
		return env.DODO_PRODUCT_ID_TEAMS_MONTHLY;
	}
	if (planId === "teams_pro" && env.DODO_PRODUCT_ID_TEAMS_PRO_MONTHLY) {
		return env.DODO_PRODUCT_ID_TEAMS_PRO_MONTHLY;
	}
	return isDodoLiveMode()
		? DODO_LIVE_PLAN_PRODUCT_IDS[planId]
		: DODO_TEST_PLAN_PRODUCT_IDS[planId];
}

export async function getWorkspaceBillingContext(args: {
	wallet: Address;
	organizationId: string;
}) {
	const walletNorm = getAddress(args.wallet);
	const [org, orgMeta] = await Promise.all([
		getOrgBillingSummary(args.organizationId),
		db
			.select({ isPersonal: organizations.isPersonal })
			.from(organizations)
			.where(eq(organizations.id, args.organizationId))
			.limit(1)
			.then((rows) => rows[0]),
	]);

	const effectivePlanId = (
		await resolveEntitlementContext(walletNorm, args.organizationId)
	).planId as PlanId;

	const allowedActions = buildWorkspaceAllowedActions({
		orgPlanId: org.planId,
		usedSeats: org.usedSeats,
		hasOrgDodo: org.hasDodoSubscription,
		orgProvider: org.provider,
		isPersonalOrg: orgMeta?.isPersonal ?? false,
	});

	const partnerInviteTrial = await resolvePartnerInviteTrialForWorkspace({
		wallet: walletNorm,
		organizationId: args.organizationId,
	});

	return {
		org,
		effectivePlanId,
		allowedActions,
		partnerInviteTrial,
	};
}

export async function getUpgradeOfferings(args: {
	organizationId: string | null;
	reason: UpgradeLimitReason;
}) {
	const orgId = args.organizationId;

	const org = orgId
		? await getOrgBillingSummary(orgId)
		: {
				planId: "free" as PlanId,
				hasDodoSubscription: false,
			};

	const orgPlanId = (org.planId ?? "free") as PlanId;

	return buildUpgradeOfferings({
		reason: args.reason,
		orgPlanId,
		hasOrgDodo: "hasDodoSubscription" in org ? org.hasDodoSubscription : false,
	});
}
