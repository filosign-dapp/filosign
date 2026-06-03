import { getPlanName, type PlanId } from "@filosign/entitlements";
import { ORPCError } from "@orpc/server";
import { and, eq, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import env from "@/env";
import { pendingOrgInviteFilter } from "@/lib/domains/invites";
import { assertSeatCountForPlan } from "@/lib/domains/orgs";
import db from "@/lib/platform/db";
import {
	type OrgBillingInterval,
	organizationInvites,
	organizationMembers,
	organizationSubscriptions,
} from "@/lib/platform/db/schema/organization";
import { users } from "@/lib/platform/db/schema/user";
import { type BillingInterval, resolveProductId } from "../billing";
import {
	createDodoClient,
	isAllowedReturnUrlOrigin,
	requireDodoApiKey,
} from "./policy";

export type OrgCheckoutPlanId = "individual" | "teams" | "teams_pro";

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

export async function getOrCreateOrgDodoCustomer(args: {
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

export function resolveOrgProductId(
	planId: OrgCheckoutPlanId,
	interval: BillingInterval,
): string {
	return resolveProductId(planId, interval);
}

export async function createOrgBillingCheckoutSession(args: {
	organizationId: string;
	adminWallet: Address;
	planId: OrgCheckoutPlanId;
	interval: BillingInterval;
	seatCount: number;
	returnUrl: string;
}): Promise<{ checkoutUrl: string; sessionId: string }> {
	assertAllowedReturnUrl(args.returnUrl);
	assertSeatCountForPlan(args.planId, args.seatCount);
	const usedSeats = await countOrgUsedSeats(args.organizationId);
	assertMinSeatCount(args.seatCount, usedSeats);

	const existing = await loadOrgSubscription(args.organizationId);
	if (
		existing?.dodoSubscriptionId &&
		existing.status === "active" &&
		existing.planId !== "free" &&
		existing.planId !== "enterprise"
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
		const quantity = args.planId === "individual" ? 1 : args.seatCount;
		checkout = (await client.checkoutSessions.create({
			product_cart: [{ product_id: productId, quantity }],
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
	const planId = (sub?.planId ?? "free") as PlanId;

	return {
		planId,
		planName: getPlanName(planId),
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

export async function createOrgBillingPortalSession(organizationId: string) {
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

export {
	changeOrgPlan,
	previewOrgPlanChange,
	previewOrgSeatChange,
	updateOrgSeats,
} from "./org-actions";
