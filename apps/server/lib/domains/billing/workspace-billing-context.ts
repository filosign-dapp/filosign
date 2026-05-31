import type { PlanId } from "@filosign/entitlements";
import type { Address } from "viem";
import { getAddress } from "viem";
import { getOrgBillingSummary } from "@/lib/domains/billing/org-billing";
import {
	buildUpgradeOfferings,
	buildWorkspaceAllowedActions,
	type UpgradeLimitReason,
} from "@/lib/domains/billing/plan-transitions";
import { getUserBillingSummary } from "@/lib/domains/billing/user-billing";
import { resolveEntitlementContext } from "@/lib/domains/entitlements/resolve-context";

export async function getWorkspaceBillingContext(args: {
	wallet: Address;
	organizationId: string;
}) {
	const walletNorm = getAddress(args.wallet);
	const [user, org] = await Promise.all([
		getUserBillingSummary(walletNorm),
		getOrgBillingSummary(args.organizationId),
	]);

	const effectivePlanId = (
		await resolveEntitlementContext(walletNorm, args.organizationId)
	).planId as PlanId;

	const allowedActions = buildWorkspaceAllowedActions({
		userPlanId: user.planId,
		orgPlanId: org.planId,
		usedSeats: org.usedSeats,
		hasOrgDodo: org.hasDodoSubscription,
		orgProvider: org.provider,
	});

	return {
		user,
		org,
		effectivePlanId,
		allowedActions,
	};
}

export async function getUpgradeOfferingsForWallet(args: {
	wallet: Address;
	organizationId: string | null;
	reason: UpgradeLimitReason;
}) {
	const walletNorm = getAddress(args.wallet);
	const orgId = args.organizationId;

	const user = await getUserBillingSummary(walletNorm);
	const org = orgId
		? await getOrgBillingSummary(orgId)
		: {
				planId: "free" as PlanId,
				hasDodoSubscription: false,
			};

	const orgPlanId = (org.planId ?? "free") as PlanId;

	return buildUpgradeOfferings({
		reason: args.reason,
		userPlanId: user.planId,
		orgPlanId,
		hasUserDodo: user.hasDodoSubscription,
		hasOrgDodo: "hasDodoSubscription" in org ? org.hasDodoSubscription : false,
	});
}
