import type { Context, Next } from "hono";
import { type Address, getAddress } from "viem";
import env from "@/env";
import { verifyThirdwebSession } from "@/lib/platform/utils/thirdweb";
import tryCatchSync, { tryCatch } from "@/lib/platform/utils/tryCatch";

const ORPC_PATH_PREFIXES = ["/api/rpc", "/api/api-reference"] as const;

function touchesOrpcUrls(pathname: string) {
	return ORPC_PATH_PREFIXES.some(
		(p) => pathname === p || pathname.startsWith(`${p}/`),
	);
}

function parseBearerWallet(
	c: Context,
): { token: string; wallet: Address } | null {
	const authHeader = c.req.header("Authorization");
	if (!authHeader?.startsWith("Bearer ")) return null;

	const token = authHeader.slice(7).trim();
	if (!token) return null;

	const walletHeader = c.req.header("X-Wallet-Address")?.trim();
	if (!walletHeader) return null;

	const walletParsed = tryCatchSync(() => getAddress(walletHeader));
	if (walletParsed.error || !walletParsed.data) return null;

	return { token, wallet: walletParsed.data };
}

/** Optional thirdweb session → `userWallet`. Invalid Bearer is ignored so RPC returns `UNAUTHORIZED` from procedures. */
export async function optionalThirdwebSessionForOrpc(c: Context, next: Next) {
	const pathname = new URL(c.req.url).pathname;
	if (!touchesOrpcUrls(pathname)) return next();

	const creds = parseBearerWallet(c);
	if (!creds) return next();

	const verified = await tryCatch(
		verifyThirdwebSession(creds.token, creds.wallet),
	);
	if (verified.error) {
		if (env.DEBUG) {
			console.error("[orpc-auth] thirdweb session failed:", verified.error);
		}
		return next();
	}

	c.set("userWallet", creds.wallet);
	return next();
}
