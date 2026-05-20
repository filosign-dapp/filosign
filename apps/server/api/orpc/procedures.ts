import { ORPCError, os } from "@orpc/server";
import type { Address } from "viem";

import { readOrgIdHeader, resolveActiveOrg } from "@/lib/domain/orgs";
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
