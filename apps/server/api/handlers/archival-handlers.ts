import { ORPCError } from "@orpc/server";
import type { Address } from "viem";
import {
	createOrgArchivalCheckoutSession,
	getArchivalProducts,
	getOrgArchivalStatus,
	parseArchivalPurchaseProductId,
} from "@/lib/domains/archival";
import { type ActiveOrgContext, assertOrgPermission } from "@/lib/domains/orgs";

export function archivalProducts() {
	return getArchivalProducts();
}

export async function archivalStatus(activeOrg: ActiveOrgContext | null) {
	if (!activeOrg) {
		throw new ORPCError("BAD_REQUEST", {
			message: "X-Org-Id header required",
		});
	}
	return getOrgArchivalStatus(activeOrg.organizationId);
}

export async function archivalPurchase(args: {
	wallet: Address;
	activeOrg: ActiveOrgContext | null;
	productId: string;
	returnUrl: string;
}) {
	if (!args.activeOrg) {
		throw new ORPCError("BAD_REQUEST", {
			message: "X-Org-Id header required",
		});
	}
	assertOrgPermission(args.activeOrg, "billing:manage");
	const productId = parseArchivalPurchaseProductId(args.productId);
	return createOrgArchivalCheckoutSession({
		organizationId: args.activeOrg.organizationId,
		adminWallet: args.wallet,
		productId,
		returnUrl: args.returnUrl,
	});
}
