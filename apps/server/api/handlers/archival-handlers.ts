import { throwAppError } from "@filosign/errors/server";
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
		throw throwAppError("WORKSPACE.ORG_CONTEXT_REQUIRED");
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
		throw throwAppError("WORKSPACE.ORG_CONTEXT_REQUIRED");
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
