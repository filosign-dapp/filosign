import { eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import type { Address } from "viem";
import env from "@/env";
import db from "@/lib/platform/db";
import { users } from "@/lib/platform/db/schema";
import { verifyJwt } from "@/lib/platform/utils/jwt";
import tryCatchSync, { tryCatch } from "@/lib/platform/utils/tryCatch";

const ORPC_PATH_PREFIXES = ["/api/rpc", "/api/api-reference"] as const;

function touchesOrpcUrls(pathname: string) {
	return ORPC_PATH_PREFIXES.some(
		(p) => pathname === p || pathname.startsWith(`${p}/`),
	);
}

/** Optional JWT → `userWallet`. Invalid/expired Bearer is ignored so RPC returns native `UNAUTHORIZED` from procedures instead of Hono `{ success:false }`. */
export async function optionalJwtWalletForOrpc(c: Context, next: Next) {
	const pathname = new URL(c.req.url).pathname;
	if (!touchesOrpcUrls(pathname)) return next();

	const authHeader = c.req.header("Authorization");
	if (!authHeader?.startsWith("Bearer ")) return next();

	const token = authHeader.slice(7);
	const verified = tryCatchSync(() => verifyJwt(token));

	if (verified.error) {
		if (env.DEBUG) {
			console.error("[orpc-auth] JWT verify failed:", verified.error);
		}
		return next();
	}

	const payload = verified.data;
	if (!payload?.sub) {
		if (env.DEBUG) {
			console.error("[orpc-auth] JWT missing sub");
		}
		return next();
	}

	const touchRes = await tryCatch(
		db
			.update(users)
			.set({ lastActiveAt: new Date() })
			.where(eq(users.walletAddress, payload.sub)),
	);
	if (touchRes.error) {
		console.error("[orpc-auth] lastActiveAt touch failed:", {
			walletHint: `${payload.sub.slice(0, 6)}…${payload.sub.slice(-4)}`,
			error:
				touchRes.error instanceof Error
					? touchRes.error.message
					: String(touchRes.error),
		});
	}

	c.set("userWallet", payload.sub as Address);
	return next();
}
