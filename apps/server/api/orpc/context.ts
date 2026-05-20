import type { LoggerContext } from "@orpc/experimental-pino";
import type { Context as HonoContext } from "hono";
import type { Address } from "viem";
import type { ActiveOrgContext } from "@/lib/domains/orgs";

export type ApiRouterVariables = {
	userWallet?: Address;
};

export type OrpcContext = LoggerContext & {
	hono: HonoContext<{ Variables: ApiRouterVariables }>;
	userWallet?: Address;
	activeOrg?: ActiveOrgContext | null;
};

export type CreateContextOptions = {
	context: HonoContext<{ Variables: ApiRouterVariables }>;
};

export async function createContext({
	context,
}: CreateContextOptions): Promise<OrpcContext> {
	return {
		hono: context,
		userWallet: context.get("userWallet"),
	};
}
