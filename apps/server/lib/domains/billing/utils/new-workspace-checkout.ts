import type { PlanId } from "@filosign/entitlements";
import { throwAppError } from "@filosign/errors/server";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import env from "@/env";
import {
	type BillingInterval,
	resolveProductId,
} from "@/lib/domains/billing/billing";
import { assertSeatCountForPlan } from "@/lib/domains/orgs/workspace";
import {
	generateSetupToken,
	normalizeEmail,
} from "@/lib/domains/platform-access";
import db from "@/lib/platform/db";
import { platformAccessPending } from "@/lib/platform/db/schema/platform-access";
import { users } from "@/lib/platform/db/schema/user";
import type { OrgCheckoutPlanId } from "./org";
import {
	createDodoClient,
	isAllowedReturnUrlOrigin,
	isWorkspaceBillingPlanId,
	requireDodoApiKey,
} from "./policy";

const NEW_WORKSPACE_PENDING_TTL_DAYS = 30;

/** Additional-workspace checkout: use Dodo products without a free trial (see project/billing/new-workspace-checkout.md). */
export const NEW_WORKSPACE_CHECKOUT_KIND = "new_workspace" as const;

function createBillingDodoClient() {
	requireDodoApiKey();
	return createDodoClient({ includeWebhookKey: false });
}

function assertAllowedReturnUrl(url: string) {
	if (
		!isAllowedReturnUrlOrigin({
			returnUrl: url,
			clientUrl: env.CLIENT_URL,
			allowedOrigins: env.BILLING_RETURN_URL_ORIGINS,
		})
	) {
		throwAppError("BILLING.RETURN_URL_DISALLOWED");
	}
}

function buildNewWorkspaceCheckoutReturnUrl(
	returnUrl: string,
	pendingBillingId: string,
): string {
	const url = new URL(returnUrl);
	url.searchParams.set("createWorkspace", "1");
	url.searchParams.set("pendingBillingId", pendingBillingId);
	return url.toString();
}

async function getOrCreatePendingDodoCustomer(args: {
	pendingId: string;
	email: string;
	wallet: Address;
}): Promise<string> {
	const [existing] = await db
		.select({ dodoCustomerId: platformAccessPending.dodoCustomerId })
		.from(platformAccessPending)
		.where(eq(platformAccessPending.id, args.pendingId))
		.limit(1);

	if (existing?.dodoCustomerId) return existing.dodoCustomerId;

	const client = createBillingDodoClient();
	let customerId: string;
	try {
		const customer = (await client.customers.create({
			email: normalizeEmail(args.email),
			name: "Filosign workspace",
			metadata: {
				filosign_pending_id: args.pendingId,
				filosign_wallet: args.wallet,
				filosign_checkout_kind: NEW_WORKSPACE_CHECKOUT_KIND,
			},
		})) as { customer_id: string };
		customerId = customer.customer_id;
	} catch (error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "Failed to create Dodo customer for new workspace checkout",
			cause: error,
		});
	}

	await db
		.update(platformAccessPending)
		.set({
			dodoCustomerId: customerId,
			updatedAt: new Date(),
		})
		.where(eq(platformAccessPending.id, args.pendingId));

	return customerId;
}

export async function createNewWorkspaceCheckoutSession(args: {
	wallet: Address;
	planId: OrgCheckoutPlanId;
	interval: BillingInterval;
	seatCount: number;
	returnUrl: string;
}): Promise<{ checkoutUrl: string; pendingBillingId: string }> {
	assertAllowedReturnUrl(args.returnUrl);
	assertSeatCountForPlan(args.planId, args.seatCount);
	if (!isWorkspaceBillingPlanId(args.planId)) {
		throwAppError("BILLING.WORKSPACE_NOT_PAID_PLAN");
	}
	if (args.planId === "individual") {
		throwAppError("BILLING.WORKSPACE_NOT_PAID_PLAN");
	}

	const wallet = getAddress(args.wallet);
	const [user] = await db
		.select({ email: users.email })
		.from(users)
		.where(eq(users.walletAddress, wallet))
		.limit(1);

	const email = user?.email?.trim();
	if (!email) {
		throwAppError("WORKSPACE.PAID_PLAN_REQUIRED");
	}

	const setupToken = generateSetupToken();
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + NEW_WORKSPACE_PENDING_TTL_DAYS);

	const [pending] = await db
		.insert(platformAccessPending)
		.values({
			setupToken,
			email: normalizeEmail(email),
			planId: args.planId,
			seatCount: args.seatCount,
			billingInterval: args.interval,
			status: "linked",
			linkedWallet: wallet,
			expiresAt,
		})
		.returning({ id: platformAccessPending.id });

	if (!pending) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "Failed to create new workspace checkout pending row",
		});
	}

	const productId = resolveProductId(args.planId, args.interval);
	const customerId = await getOrCreatePendingDodoCustomer({
		pendingId: pending.id,
		email,
		wallet,
	});
	const client = createBillingDodoClient();
	const checkoutReturnUrl = buildNewWorkspaceCheckoutReturnUrl(
		args.returnUrl,
		pending.id,
	);

	let checkout: {
		session_id: string;
		url?: string | null;
		checkout_url?: string | null;
	};
	try {
		checkout = (await client.checkoutSessions.create({
			product_cart: [{ product_id: productId, quantity: args.seatCount }],
			customer: { customer_id: customerId },
			feature_flags: {
				redirect_immediately: true,
			},
			return_url: checkoutReturnUrl,
			metadata: {
				filosign_setup_token: setupToken,
				filosign_pending_id: pending.id,
				filosign_wallet: wallet,
				filosign_checkout_kind: NEW_WORKSPACE_CHECKOUT_KIND,
				filosign_plan_id: args.planId,
				filosign_interval: args.interval,
				filosign_seat_count: String(args.seatCount),
				filosign_no_trial: "true",
			},
		})) as {
			session_id: string;
			url?: string | null;
			checkout_url?: string | null;
		};
	} catch (error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "Failed to create Dodo checkout session for new workspace",
			cause: error,
		});
	}

	const checkoutUrl = checkout.url ?? checkout.checkout_url;
	if (!checkoutUrl) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "Dodo checkout URL was not returned",
		});
	}

	await db
		.update(platformAccessPending)
		.set({
			dodoCheckoutSessionId: checkout.session_id,
			updatedAt: new Date(),
		})
		.where(eq(platformAccessPending.id, pending.id));

	return { checkoutUrl, pendingBillingId: pending.id };
}

export async function syncNewWorkspacePendingFromWebhook(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	args: {
		pendingId: string;
		dodoSubscriptionId: string;
		dodoCustomerId: string | null;
		planId: PlanId;
		seatCount: number;
		billingInterval: "monthly" | "yearly" | null;
	},
): Promise<boolean> {
	if (!isWorkspaceBillingPlanId(args.planId) || args.planId === "individual") {
		return false;
	}

	const [pending] = await tx
		.select({
			id: platformAccessPending.id,
			linkedOrganizationId: platformAccessPending.linkedOrganizationId,
			linkedWallet: platformAccessPending.linkedWallet,
		})
		.from(platformAccessPending)
		.where(eq(platformAccessPending.id, args.pendingId))
		.limit(1);

	if (!pending?.linkedWallet || pending.linkedOrganizationId) {
		return false;
	}

	await tx
		.update(platformAccessPending)
		.set({
			planId: args.planId,
			dodoSubscriptionId: args.dodoSubscriptionId,
			dodoCustomerId: args.dodoCustomerId ?? undefined,
			seatCount: args.seatCount,
			billingInterval: args.billingInterval ?? undefined,
			status: "linked",
			updatedAt: new Date(),
		})
		.where(eq(platformAccessPending.id, args.pendingId));

	return true;
}
