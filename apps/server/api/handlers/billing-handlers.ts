import type { Address } from "viem";
import { getAddress } from "viem";
import { z } from "zod";
import {
	assertMarketingCheckoutAllowed,
	type BillingInterval,
	CHECKOUT_PLAN_IDS,
	changeOrgPlan,
	createNewWorkspaceCheckoutSession,
	createOrgBillingCheckoutSession,
	createOrgBillingPortalSession,
	getNewWorkspacePendingStatus,
	getOrgBillingSummary,
	getUpgradeOfferings,
	getWorkspaceBillingContext,
	type OrgCheckoutPlanId,
	previewMarketingCheckout,
	previewOrgPlanChange,
	previewOrgSeatChange,
	requestCheckoutLink,
	resendPaidSetupLink,
	type UPGRADE_LIMIT_REASONS,
	updateOrgSeats,
} from "@/lib/domains/billing";
import {
	buildEntitlementsSnapshot,
	resolveEntitlementContext,
} from "@/lib/domains/entitlements";
import { type ActiveOrgContext, assertOrgPermission } from "@/lib/domains/orgs";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";

export async function billingEntitlements(
	wallet: Address,
	activeOrg: ActiveOrgContext | null,
) {
	const ctx = await resolveEntitlementContext(
		getAddress(wallet),
		activeOrg?.organizationId ?? null,
	);
	return buildEntitlementsSnapshot(ctx);
}

export async function billingGetWorkspaceBillingContext(
	wallet: Address,
	activeOrg: ActiveOrgContext | null,
) {
	const org = requireOrgBilling(activeOrg);
	return getWorkspaceBillingContext({
		wallet: getAddress(wallet),
		organizationId: org.organizationId,
	});
}

export async function billingGetUpgradeOfferings(
	activeOrg: ActiveOrgContext | null,
	reason: (typeof UPGRADE_LIMIT_REASONS)[number],
) {
	return getUpgradeOfferings({
		organizationId: activeOrg?.organizationId ?? null,
		reason,
	});
}

export async function billingPreviewMarketingCheckout(body: unknown) {
	const parsed = z
		.object({
			email: z.email(),
			planId: z.enum(CHECKOUT_PLAN_IDS),
			interval: z.enum(["monthly", "yearly"]).default("monthly"),
			seatCount: z.number().int().min(1).optional(),
		})
		.safeParse(body);

	if (parsed.error) {
		throwZodBadRequest(parsed.error);
	}

	return previewMarketingCheckout(parsed.data);
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

export async function billingCreateNewWorkspaceCheckoutSession(args: {
	wallet: Address;
	planId: OrgCheckoutPlanId;
	interval: BillingInterval;
	seatCount: number;
	returnUrl: string;
}) {
	return createNewWorkspaceCheckoutSession({
		wallet: getAddress(args.wallet),
		planId: args.planId,
		interval: args.interval,
		seatCount: args.seatCount,
		returnUrl: args.returnUrl,
	});
}

export async function billingGetNewWorkspacePendingStatus(args: {
	wallet: Address;
	pendingBillingId: string;
}) {
	return getNewWorkspacePendingStatus({
		wallet: getAddress(args.wallet),
		pendingBillingId: args.pendingBillingId,
	});
}

export async function billingRequestCheckoutLink(body: unknown) {
	const parsed = z
		.object({
			email: z.email(),
			planId: z.enum(CHECKOUT_PLAN_IDS),
			interval: z.enum(["monthly", "yearly"]).default("monthly"),
			seatCount: z.number().int().min(1).optional(),
		})
		.safeParse(body);

	if (parsed.error) {
		throwZodBadRequest(parsed.error);
	}

	await assertMarketingCheckoutAllowed({
		email: parsed.data.email,
		planId: parsed.data.planId,
	});

	return requestCheckoutLink(parsed.data);
}

export async function billingResendSetupLink(body: unknown) {
	const parsed = z.object({ email: z.email() }).safeParse(body);
	if (parsed.error) {
		throwZodBadRequest(parsed.error);
	}
	return resendPaidSetupLink(parsed.data);
}
