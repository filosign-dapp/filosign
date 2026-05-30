import { billingEnabled } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { and, eq, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import env from "@/env";
import { pendingOrgInviteFilter } from "@/lib/domains/invites";
import db from "@/lib/platform/db";
import {
	type OrgBillingInterval,
	organizationInvites,
	organizationMembers,
	organizationSubscriptions,
} from "@/lib/platform/db/schema/organization";
import { users } from "@/lib/platform/db/schema/user";
import { type BillingInterval, resolveProductId } from "./billing";
import { createDodoClient, requireDodoApiKey } from "./dodo-client";
import { isAllowedReturnUrlOrigin } from "./policy";

export type OrgCheckoutPlanId = "teams" | "teams_pro";

function createBillingDodoClient() {
	requireDodoApiKey();
	return createDodoClient({ includeWebhookKey: false });
}

function defaultOrgPortalReturnUrl() {
	return `${env.CLIENT_URL.replace(/\/$/, "")}/dashboard/settings/workspace`;
}

function assertAllowedReturnUrl(url: string) {
	if (
		!isAllowedReturnUrlOrigin({
			returnUrl: url,
			clientUrl: env.CLIENT_URL,
			allowedOrigins: env.BILLING_RETURN_URL_ORIGINS,
		})
	) {
		throw new ORPCError("BAD_REQUEST", {
			message: "returnUrl origin is not allowed",
		});
	}
}

function buildCustomerName(firstName: string | null, lastName: string | null) {
	const full = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ");
	if (full) return full;
	return "Filosign workspace";
}

export async function countOrgUsedSeats(
	organizationId: string,
): Promise<number> {
	const [activeMembers] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(organizationMembers)
		.where(
			and(
				eq(organizationMembers.organizationId, organizationId),
				eq(organizationMembers.status, "active"),
			),
		);
	const [openInvites] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(organizationInvites)
		.where(
			and(
				eq(organizationInvites.organizationId, organizationId),
				pendingOrgInviteFilter(),
			),
		);

	return (activeMembers?.count ?? 0) + (openInvites?.count ?? 0);
}

async function loadOrgSubscription(organizationId: string) {
	const [sub] = await db
		.select()
		.from(organizationSubscriptions)
		.where(eq(organizationSubscriptions.organizationId, organizationId))
		.limit(1);
	return sub ?? null;
}

async function getOrCreateOrgDodoCustomer(args: {
	organizationId: string;
	adminWallet: Address;
}): Promise<string> {
	const existing = await loadOrgSubscription(args.organizationId);
	if (existing?.dodoCustomerId) return existing.dodoCustomerId;

	const adminNorm = getAddress(args.adminWallet);
	const [user] = await db
		.select({
			email: users.email,
			firstName: users.firstName,
			lastName: users.lastName,
		})
		.from(users)
		.where(eq(users.walletAddress, adminNorm))
		.limit(1);

	if (!user?.email) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Admin email is required for workspace checkout",
		});
	}

	const client = createBillingDodoClient();
	let customerId: string;
	try {
		const customer = (await client.customers.create({
			email: user.email,
			name: buildCustomerName(user.firstName, user.lastName),
			metadata: {
				filosign_org_id: args.organizationId,
				filosign_wallet: adminNorm,
			},
		})) as { customer_id: string };
		customerId = customer.customer_id;
	} catch (error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to create Dodo customer for workspace",
			cause: error,
		});
	}

	await db
		.update(organizationSubscriptions)
		.set({
			dodoCustomerId: customerId,
			provider: "dodo",
			updatedAt: new Date(),
		})
		.where(eq(organizationSubscriptions.organizationId, args.organizationId));

	return customerId;
}

function assertMinSeatCount(seatCount: number, usedSeats: number) {
	if (!Number.isInteger(seatCount) || seatCount < 1) {
		throw new ORPCError("BAD_REQUEST", {
			message: "seatCount must be a positive integer",
		});
	}
	if (seatCount < usedSeats) {
		throw new ORPCError("BAD_REQUEST", {
			message: `seatCount cannot be below current usage (${usedSeats} members and pending invites)`,
		});
	}
}

function resolveOrgProductId(
	planId: OrgCheckoutPlanId,
	interval: BillingInterval,
): string {
	return resolveProductId(planId, interval);
}

async function requireActiveOrgSubscription(organizationId: string) {
	const sub = await loadOrgSubscription(organizationId);
	if (!sub?.dodoSubscriptionId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Workspace has no active Dodo subscription",
		});
	}
	if (sub.planId !== "teams" && sub.planId !== "teams_pro") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Workspace subscription is not a paid team plan",
		});
	}
	if (!sub.billingInterval) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Workspace billing interval is unknown; contact support",
		});
	}
	return sub;
}

type PlanChangePreview = {
	immediate_charge: {
		effective_at: string;
		summary: { total_amount: number; currency: string };
	};
	new_plan: { quantity: number };
};

async function previewOrgPlanChangeInternal(args: {
	subscriptionId: string;
	productId: string;
	quantity: number;
}) {
	const client = createBillingDodoClient();
	try {
		return (await client.subscriptions.previewChangePlan(args.subscriptionId, {
			product_id: args.productId,
			quantity: args.quantity,
			proration_billing_mode: "prorated_immediately",
		})) as PlanChangePreview;
	} catch (error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to preview plan change",
			cause: error,
		});
	}
}

async function changeOrgPlanInternal(args: {
	subscriptionId: string;
	productId: string;
	quantity: number;
}) {
	const client = createBillingDodoClient();
	try {
		await client.subscriptions.changePlan(args.subscriptionId, {
			product_id: args.productId,
			quantity: args.quantity,
			proration_billing_mode: "prorated_immediately",
			on_payment_failure: "prevent_change",
		});
	} catch (error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to change workspace plan",
			cause: error,
		});
	}
}

function formatPlanChangePreview(
	preview: PlanChangePreview,
	args: {
		seatCount: number;
		currentSeatCount: number;
		targetPlanId: OrgCheckoutPlanId;
		currentPlanId: OrgCheckoutPlanId;
	},
) {
	return {
		planId: args.targetPlanId,
		currentPlanId: args.currentPlanId,
		seatCount: args.seatCount,
		currentSeatCount: args.currentSeatCount,
		effectiveAt: preview.immediate_charge.effective_at,
		immediateChargeCents: preview.immediate_charge.summary.total_amount,
		currency: preview.immediate_charge.summary.currency,
	};
}

export async function createOrgBillingCheckoutSession(args: {
	organizationId: string;
	adminWallet: Address;
	planId: OrgCheckoutPlanId;
	interval: BillingInterval;
	seatCount: number;
	returnUrl: string;
}): Promise<{ checkoutUrl: string; sessionId: string }> {
	if (!billingEnabled(env.DEPLOYMENT)) {
		throw new ORPCError("FORBIDDEN", {
			message: "Billing is not available in this environment",
		});
	}

	assertAllowedReturnUrl(args.returnUrl);
	const usedSeats = await countOrgUsedSeats(args.organizationId);
	assertMinSeatCount(args.seatCount, usedSeats);

	const existing = await loadOrgSubscription(args.organizationId);
	if (
		existing?.dodoSubscriptionId &&
		existing.status === "active" &&
		(existing.planId === "teams" || existing.planId === "teams_pro")
	) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"Workspace already has a paid subscription. Adjust seats from billing settings.",
		});
	}

	const productId = resolveOrgProductId(args.planId, args.interval);
	const customerId = await getOrCreateOrgDodoCustomer({
		organizationId: args.organizationId,
		adminWallet: args.adminWallet,
	});
	const adminNorm = getAddress(args.adminWallet);
	const client = createBillingDodoClient();

	let checkout: {
		session_id: string;
		url?: string | null;
		checkout_url?: string | null;
	};
	try {
		checkout = (await client.checkoutSessions.create({
			product_cart: [{ product_id: productId, quantity: args.seatCount }],
			customer: { customer_id: customerId },
			return_url: args.returnUrl,
			metadata: {
				filosign_org_id: args.organizationId,
				filosign_plan_id: args.planId,
				filosign_interval: args.interval,
				filosign_wallet: adminNorm,
			},
		})) as {
			session_id: string;
			url?: string | null;
			checkout_url?: string | null;
		};
	} catch (error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to create Dodo checkout session",
			cause: error,
		});
	}

	const checkoutUrl = checkout.url ?? checkout.checkout_url;
	if (!checkoutUrl) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Dodo checkout URL was not returned",
		});
	}

	return {
		checkoutUrl,
		sessionId: checkout.session_id,
	};
}

export async function getOrgBillingSummary(organizationId: string) {
	const sub = await loadOrgSubscription(organizationId);
	const usedSeats = await countOrgUsedSeats(organizationId);

	return {
		planId: sub?.planId ?? "free",
		seatCount: sub?.seatCount ?? 1,
		usedSeats,
		status: sub?.status ?? "active",
		provider: sub?.provider ?? "manual",
		billingInterval: (sub?.billingInterval ??
			null) as OrgBillingInterval | null,
		periodStart: sub?.periodStart?.toISOString() ?? null,
		periodEnd: sub?.periodEnd?.toISOString() ?? null,
		cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
		hasDodoSubscription: Boolean(sub?.dodoSubscriptionId),
	};
}

export async function previewOrgSeatChange(args: {
	organizationId: string;
	seatCount: number;
}) {
	const sub = await requireActiveOrgSubscription(args.organizationId);
	const usedSeats = await countOrgUsedSeats(args.organizationId);
	assertMinSeatCount(args.seatCount, usedSeats);

	const productId = resolveOrgProductId(
		sub.planId as OrgCheckoutPlanId,
		sub.billingInterval as BillingInterval,
	);

	const preview = await previewOrgPlanChangeInternal({
		subscriptionId: sub.dodoSubscriptionId as string,
		productId,
		quantity: args.seatCount,
	});

	return formatPlanChangePreview(preview, {
		seatCount: args.seatCount,
		currentSeatCount: sub.seatCount,
		targetPlanId: sub.planId as OrgCheckoutPlanId,
		currentPlanId: sub.planId as OrgCheckoutPlanId,
	});
}

export async function updateOrgSeats(args: {
	organizationId: string;
	seatCount: number;
}) {
	const sub = await requireActiveOrgSubscription(args.organizationId);
	const usedSeats = await countOrgUsedSeats(args.organizationId);
	assertMinSeatCount(args.seatCount, usedSeats);

	if (args.seatCount === sub.seatCount) {
		return { seatCount: sub.seatCount };
	}

	const productId = resolveOrgProductId(
		sub.planId as OrgCheckoutPlanId,
		sub.billingInterval as BillingInterval,
	);

	await changeOrgPlanInternal({
		subscriptionId: sub.dodoSubscriptionId as string,
		productId,
		quantity: args.seatCount,
	});

	return { seatCount: args.seatCount };
}

export async function previewOrgPlanChange(args: {
	organizationId: string;
	planId: OrgCheckoutPlanId;
}) {
	const sub = await requireActiveOrgSubscription(args.organizationId);
	if (sub.planId === args.planId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Workspace is already on this plan",
		});
	}

	const productId = resolveOrgProductId(
		args.planId,
		sub.billingInterval as BillingInterval,
	);
	const preview = await previewOrgPlanChangeInternal({
		subscriptionId: sub.dodoSubscriptionId as string,
		productId,
		quantity: sub.seatCount,
	});

	return formatPlanChangePreview(preview, {
		seatCount: sub.seatCount,
		currentSeatCount: sub.seatCount,
		targetPlanId: args.planId,
		currentPlanId: sub.planId as OrgCheckoutPlanId,
	});
}

export async function changeOrgPlan(args: {
	organizationId: string;
	planId: OrgCheckoutPlanId;
}) {
	const sub = await requireActiveOrgSubscription(args.organizationId);
	if (sub.planId === args.planId) {
		return { planId: sub.planId, seatCount: sub.seatCount };
	}

	const productId = resolveOrgProductId(
		args.planId,
		sub.billingInterval as BillingInterval,
	);

	await changeOrgPlanInternal({
		subscriptionId: sub.dodoSubscriptionId as string,
		productId,
		quantity: sub.seatCount,
	});

	return { planId: args.planId, seatCount: sub.seatCount };
}

export async function createOrgBillingPortalSession(organizationId: string) {
	if (!billingEnabled(env.DEPLOYMENT)) {
		throw new ORPCError("FORBIDDEN", {
			message: "Billing is not available in this environment",
		});
	}

	const sub = await loadOrgSubscription(organizationId);
	if (!sub?.dodoCustomerId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "No Dodo customer found for this workspace",
		});
	}

	const client = createBillingDodoClient();
	try {
		const portal = (await client.customers.customerPortal.create(
			sub.dodoCustomerId,
			{ return_url: defaultOrgPortalReturnUrl() },
		)) as { link: string; url?: string };
		return { url: portal.url ?? portal.link };
	} catch (error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to create Dodo portal session",
			cause: error,
		});
	}
}
