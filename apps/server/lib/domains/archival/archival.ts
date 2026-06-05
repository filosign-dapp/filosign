import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { z } from "zod";
import env from "@/env";
import {
	type ArchivalProductId,
	isArchivalProductId,
	listArchivalCatalogProducts,
	resolveDodoProductIdForArchival,
} from "@/lib/domains/billing/utils/archival-products";
import { getOrCreateOrgDodoCustomer } from "@/lib/domains/billing/utils/org";
import {
	createDodoClient,
	isAllowedReturnUrlOrigin,
	requireDodoApiKey,
} from "@/lib/domains/billing/utils/policy";
import {
	assertEntitlement,
	resolveEntitlementContext,
} from "@/lib/domains/entitlements";
import db from "@/lib/platform/db";
import type { OrganizationArchivalStatus } from "@/lib/platform/db/schema/organization";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";

const { organizationArchival } = db.schema;

export function getArchivalProducts() {
	return { products: listArchivalCatalogProducts() };
}

export async function getOrgArchivalStatus(organizationId: string) {
	const [row] = await db
		.select()
		.from(organizationArchival)
		.where(eq(organizationArchival.organizationId, organizationId))
		.limit(1);

	if (!row || row.status === "none") {
		return {
			active: false,
			productId: null,
			retentionUntil: null,
			exportGraceUntil: null,
			subscriptionStatus: "none" as const,
		};
	}

	return {
		active: row.status === "active",
		productId: row.productId,
		retentionUntil: row.retentionUntil?.toISOString() ?? null,
		exportGraceUntil: row.exportGraceUntil?.toISOString() ?? null,
		subscriptionStatus: row.status as OrganizationArchivalStatus,
	};
}

export async function createOrgArchivalCheckoutSession(args: {
	organizationId: string;
	adminWallet: Address;
	productId: ArchivalProductId;
	returnUrl: string;
}): Promise<{ checkoutUrl: string; sessionId: string }> {
	if (
		!isAllowedReturnUrlOrigin({
			returnUrl: args.returnUrl,
			clientUrl: env.CLIENT_URL,
			allowedOrigins: env.BILLING_RETURN_URL_ORIGINS,
		})
	) {
		throw throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					path: ["returnUrl"],
					message: "returnUrl origin is not allowed",
				},
			]),
		);
	}

	const entitlementCtx = await resolveEntitlementContext(
		getAddress(args.adminWallet),
		args.organizationId,
	);
	assertEntitlement(entitlementCtx, "features.archival.purchase");

	requireDodoApiKey();
	const dodoProductId = resolveDodoProductIdForArchival(args.productId);
	const customerId = await getOrCreateOrgDodoCustomer({
		organizationId: args.organizationId,
		adminWallet: args.adminWallet,
	});
	const client = createDodoClient({ includeWebhookKey: false });

	let checkout: {
		session_id: string;
		url?: string | null;
		checkout_url?: string | null;
	};
	try {
		checkout = (await client.checkoutSessions.create({
			product_cart: [{ product_id: dodoProductId, quantity: 1 }],
			customer: { customer_id: customerId },
			return_url: args.returnUrl,
			metadata: {
				filosign_org_id: args.organizationId,
				filosign_archival_product_id: args.productId,
				filosign_wallet: getAddress(args.adminWallet),
			},
		})) as typeof checkout;
	} catch (error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "Failed to create archival checkout session",
			cause: error,
		});
	}

	const checkoutUrl = checkout.url ?? checkout.checkout_url;
	if (!checkoutUrl) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "Dodo checkout URL was not returned",
		});
	}

	return { checkoutUrl, sessionId: checkout.session_id };
}

export function parseArchivalPurchaseProductId(
	productId: string,
): ArchivalProductId {
	if (!isArchivalProductId(productId)) {
		throw throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					path: ["productId"],
					message: "Unknown archival product",
				},
			]),
		);
	}
	return productId;
}
