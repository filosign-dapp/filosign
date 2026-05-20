import { createRefreshTokenRaw } from "@filosign/auth";
import { signatures, toBytes } from "@filosign/crypto-utils/node";
import { zHexString } from "@filosign/shared/zod";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import {
	type Address,
	getAddress,
	type Hash,
	isAddress,
	keccak256,
	numberToHex,
} from "viem";
import { z } from "zod";
import type { OrpcContext } from "@/api/orpc/context";
import {
	authCookies,
	authJwt,
	authStore,
	checkAuthRateLimit,
} from "@/lib/platform/auth/instance";
import db from "@/lib/platform/db";
import { users } from "@/lib/platform/db/schema";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const { buildRefreshClearCookie, buildRefreshSetCookie, readRefreshCookie } =
	authCookies;
const { issueAccessJwtToken, verifyJwt } = authJwt;

export const zAuthVerifyBody = z.object({
	address: z.string().refine((v) => isAddress(v), {
		message: "Invalid address",
	}),
	signature: zHexString(),
});

async function assertRateLimit(
	route: "auth.nonce" | "auth.verify" | "auth.refresh" | "auth.logout",
	id: string,
) {
	const result = await Promise.resolve(checkAuthRateLimit(route, id));
	if (!result.allowed) {
		throw new ORPCError("TOO_MANY_REQUESTS", {
			message: "Too many authentication attempts",
		});
	}
}

function appendSetCookie(context: OrpcContext, value: string) {
	if (!context.authSetCookies) context.authSetCookies = [];
	context.authSetCookies.push(value);
}

export async function authNonce(walletInput: string, context: OrpcContext) {
	const walletAddress = getAddress(walletInput);
	const { ip } = requestMetaFromContext(context);
	await assertRateLimit("auth.nonce", `${ip ?? "unknown"}:${walletAddress}`);

	const nonce = keccak256(
		numberToHex(Math.floor(Date.now() + Math.random() * 1e10)),
	) as Hash;
	await authStore.upsertAuthNonce(walletAddress, nonce);
	return { nonce };
}

function requestMetaFromContext(context: OrpcContext) {
	const req = context.hono.req;
	const forwarded = req.header("x-forwarded-for");
	const ip =
		forwarded?.split(",")[0]?.trim() ?? req.header("x-real-ip") ?? undefined;
	const userAgent = req.header("user-agent") ?? undefined;
	return { ip, userAgent };
}

export async function authVerify(
	input: z.infer<typeof zAuthVerifyBody>,
	context: OrpcContext,
) {
	const walletAddress = getAddress(input.address);
	const { ip, userAgent } = requestMetaFromContext(context);
	await assertRateLimit("auth.verify", `${ip ?? "unknown"}:${walletAddress}`);

	const storedNonce = await authStore.takeAuthNonce(walletAddress);
	if (!storedNonce) {
		await authStore.recordAuthAuditEvent({
			event: "auth.verify.nonce_expired",
			walletAddress,
			ip,
			userAgent,
		});
		throw new ORPCError("BAD_REQUEST", {
			message: "Message expired or not found",
		});
	}

	const userRecordResult = await tryCatch(
		db
			.select({
				signaturePublicKey: users.signaturePublicKey,
			})
			.from(users)
			.where(eq(users.walletAddress, walletAddress))
			.limit(1),
	);

	if (userRecordResult.error) {
		console.error("[auth.verify] user lookup failed", {
			walletAddress,
			error:
				userRecordResult.error instanceof Error
					? userRecordResult.error.message
					: String(userRecordResult.error),
		});
		throw new ORPCError("SERVICE_UNAVAILABLE", {
			message: "Authentication temporarily unavailable",
		});
	}

	const [userRecord] = userRecordResult.data;
	if (!userRecord) {
		throw new ORPCError("UNAUTHORIZED", { message: "You are not registered" });
	}

	const valid = await signatures.verify({
		dl: await signatures.dilithiumInstance(),
		message: toBytes(storedNonce),
		signature: toBytes(input.signature),
		publicKey: toBytes(userRecord.signaturePublicKey),
	});

	if (!valid) {
		await authStore.recordAuthAuditEvent({
			event: "auth.verify.signature_invalid",
			walletAddress,
			ip,
			userAgent,
		});
		throw new ORPCError("BAD_REQUEST", { message: "Invalid signature" });
	}

	await tryCatch(
		db
			.update(users)
			.set({ lastActiveAt: new Date() })
			.where(eq(users.walletAddress, walletAddress)),
	);

	const { token } = issueAccessJwtToken(walletAddress);
	const refreshRaw = createRefreshTokenRaw();
	await authStore.createRefreshSession({
		walletAddress,
		rawToken: refreshRaw,
		userAgent,
	});
	appendSetCookie(context, buildRefreshSetCookie(refreshRaw));

	return { valid: true as const, token };
}

export async function authRefresh(context: OrpcContext) {
	const cookieHeader = context.hono.req.header("cookie");
	const raw = readRefreshCookie(cookieHeader);
	const { ip, userAgent } = requestMetaFromContext(context);
	await assertRateLimit("auth.refresh", ip ?? "unknown");

	if (!raw) {
		await authStore.recordAuthAuditEvent({
			event: "auth.refresh.missing_cookie",
			ip,
			userAgent,
		});
		throw new ORPCError("UNAUTHORIZED", { message: "Refresh session missing" });
	}

	const reuseFamily = await authStore.detectRefreshTokenReuse(raw);
	if (reuseFamily) {
		await authStore.revokeRefreshFamily(reuseFamily);
		await authStore.recordAuthAuditEvent({
			event: "auth.refresh.reuse_detected",
			ip,
			userAgent,
			detail: reuseFamily,
		});
		appendSetCookie(context, buildRefreshClearCookie());
		throw new ORPCError("UNAUTHORIZED", {
			message: "Refresh token reuse detected",
		});
	}

	const session = await authStore.findActiveRefreshSession(raw);
	if (!session) {
		await authStore.recordAuthAuditEvent({
			event: "auth.refresh.invalid",
			ip,
			userAgent,
		});
		throw new ORPCError("UNAUTHORIZED", { message: "Invalid refresh session" });
	}

	const newRaw = createRefreshTokenRaw();
	await authStore.rotateRefreshSession({ session, newRawToken: newRaw });
	appendSetCookie(context, buildRefreshSetCookie(newRaw));

	const { token } = issueAccessJwtToken(session.walletAddress);
	return { token };
}

export async function authLogout(context: OrpcContext) {
	const { ip, userAgent } = requestMetaFromContext(context);
	await assertRateLimit("auth.logout", ip ?? "unknown");

	const authHeader = context.hono.req.header("Authorization");
	if (authHeader?.startsWith("Bearer ")) {
		try {
			const payload = verifyJwt(authHeader.slice(7));
			await authStore.revokeAccessJti(
				payload.jti,
				new Date(payload.exp * 1000),
			);
		} catch {
			// ignore invalid access token on logout
		}
	}

	const raw = readRefreshCookie(context.hono.req.header("cookie"));
	let wallet: Address | undefined;
	if (raw) {
		const reuseFamily = await authStore.detectRefreshTokenReuse(raw);
		if (reuseFamily) {
			await authStore.revokeRefreshFamily(reuseFamily);
		} else {
			const session = await authStore.findActiveRefreshSession(raw);
			if (session) {
				wallet = session.walletAddress;
				await authStore.revokeRefreshFamily(session.familyId);
			}
		}
	}

	appendSetCookie(context, buildRefreshClearCookie());
	await authStore.recordAuthAuditEvent({
		event: "auth.logout",
		walletAddress: wallet,
		ip,
		userAgent,
	});

	return { ok: true as const };
}
