import { ORPCError, os } from "@orpc/server";
import type { Address } from "viem";

import { readOrgIdHeader, resolveActiveOrg } from "@/lib/domains/orgs";
import type { OrpcContext } from "./context";

export const o = os.$context<OrpcContext>();

export const publicProcedure = o;

export const authenticatedProcedure = publicProcedure.use(
	async ({ context, next }) => {
		const wallet = context.userWallet;
		if (!wallet) {
			throw new ORPCError("UNAUTHORIZED", {
				message: "Missing or invalid authorization",
			});
		}
		const walletNorm = wallet as Address;
		const orgId = readOrgIdHeader(context.hono.req.header("x-org-id"));
		const activeOrg = await resolveActiveOrg(walletNorm, orgId);
		return next({
			context: {
				...context,
				userWallet: walletNorm,
				activeOrg,
			},
		});
	},
);

export const orgProcedure = authenticatedProcedure.use(
	async ({ context, next }) => {
		const orgIdHeader = context.hono.req.header("x-org-id");
		if (orgIdHeader && !context.activeOrg) {
			throw new ORPCError("FORBIDDEN", {
				message: "Not an active member of this organization",
			});
		}
		if (!context.activeOrg) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Organization context required (X-Org-Id header)",
			});
		}
		return next({
			context: {
				...context,
				activeOrg: context.activeOrg,
			},
		});
	},
);
