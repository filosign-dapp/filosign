import type { Address } from "viem";
import { getAddress } from "viem";
import {
	type BillingInterval,
	changeOrgPlan,
	createBillingCheckoutSession,
	createBillingPortalSession,
	createOrgBillingCheckoutSession,
	createOrgBillingPortalSession,
	getOrgBillingSummary,
	type OrgCheckoutPlanId,
	previewOrgPlanChange,
	previewOrgSeatChange,
	updateOrgSeats,
} from "@/lib/domains/billing";
import {
	buildEntitlementsSnapshot,
	resolveEntitlementContext,
} from "@/lib/domains/entitlements";
import { type ActiveOrgContext, assertOrgPermission } from "@/lib/domains/orgs";

export async function billingEntitlements(wallet: Address) {
	const ctx = await resolveEntitlementContext(getAddress(wallet));
	return buildEntitlementsSnapshot(ctx);
}

export async function billingCreateCheckoutSession(args: {
	wallet: Address;
	planId: "individual" | "teams" | "teams_pro";
	interval: BillingInterval;
	returnUrl: string;
}) {
	return createBillingCheckoutSession(args);
}

export async function billingCreatePortalSession(wallet: Address) {
	return createBillingPortalSession({ wallet });
}

function requireOrgBilling(
	activeOrg: ActiveOrgContext | null,
): ActiveOrgContext {
	assertOrgPermission(activeOrg, "billing:manage");
	return activeOrg;
}

export async function billingGetOrgSummary(activeOrg: ActiveOrgContext | null) {
	const org = requireOrgBilling(activeOrg);
	return getOrgBillingSummary(org.organizationId);
}

export async function billingCreateOrgCheckoutSession(args: {
	wallet: Address;
	activeOrg: ActiveOrgContext | null;
	planId: OrgCheckoutPlanId;
	interval: BillingInterval;
	seatCount: number;
	returnUrl: string;
}) {
	const org = requireOrgBilling(args.activeOrg);
	return createOrgBillingCheckoutSession({
		organizationId: org.organizationId,
		adminWallet: getAddress(args.wallet),
		planId: args.planId,
		interval: args.interval,
		seatCount: args.seatCount,
		returnUrl: args.returnUrl,
	});
}

export async function billingPreviewOrgSeatChange(args: {
	activeOrg: ActiveOrgContext | null;
	seatCount: number;
}) {
	const org = requireOrgBilling(args.activeOrg);
	return previewOrgSeatChange({
		organizationId: org.organizationId,
		seatCount: args.seatCount,
	});
}

export async function billingUpdateOrgSeats(args: {
	activeOrg: ActiveOrgContext | null;
	seatCount: number;
}) {
	const org = requireOrgBilling(args.activeOrg);
	return updateOrgSeats({
		organizationId: org.organizationId,
		seatCount: args.seatCount,
	});
}

export async function billingCreateOrgPortalSession(
	activeOrg: ActiveOrgContext | null,
) {
	const org = requireOrgBilling(activeOrg);
	return createOrgBillingPortalSession(org.organizationId);
}

export async function billingPreviewOrgPlanChange(args: {
	activeOrg: ActiveOrgContext | null;
	planId: OrgCheckoutPlanId;
}) {
	const org = requireOrgBilling(args.activeOrg);
	return previewOrgPlanChange({
		organizationId: org.organizationId,
		planId: args.planId,
	});
}

export async function billingChangeOrgPlan(args: {
	activeOrg: ActiveOrgContext | null;
	planId: OrgCheckoutPlanId;
}) {
	const org = requireOrgBilling(args.activeOrg);
	return changeOrgPlan({
		organizationId: org.organizationId,
		planId: args.planId,
	});
}
