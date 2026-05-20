import {
	type AuthRateLimiter,
	type AuthStore,
	createAuthCookies,
	createAuthJwt,
	createDragonflyAuthStore,
	createMemoryAuthRateLimiter,
	createRedisAuthRateLimiter,
	type DragonflyAuthStore,
	defaultAuthConfig,
} from "@filosign/auth";
import { DOMAIN } from "@/constants";
import env from "@/env";
import { createPostgresAuthStore } from "@/lib/platform/auth/postgres-store";
import db from "@/lib/platform/db";
import { authAuditEvents } from "@/lib/platform/db/schema";

const secureCookies = env.CHAIN === "mainnet";

export const authConfig = defaultAuthConfig({
	jwtSecret: env.JWT_SECRET,
	jwtIssuer: DOMAIN,
	secureCookies,
});

export const authJwt = createAuthJwt(authConfig.jwt);
export const authCookies = createAuthCookies(authConfig.cookies);

const { issueAccessJwtToken, verifyJwt, isAccessToken } = authJwt;

export { isAccessToken, issueAccessJwtToken, verifyJwt };

async function persistAuditToPostgres(
	params: Parameters<AuthStore["recordAuthAuditEvent"]>[0],
) {
	await db.insert(authAuditEvents).values({
		event: params.event,
		walletAddress: params.walletAddress,
		ip: params.ip ?? null,
		userAgent: params.userAgent ?? null,
		detail: params.detail ?? null,
	});
}

function createStore(): AuthStore {
	if (env.DRAGONFLY_URL) {
		return createDragonflyAuthStore(env.DRAGONFLY_URL, authConfig, {
			onAudit: persistAuditToPostgres,
		});
	}
	return createPostgresAuthStore(authConfig);
}

export const authStore = createStore();

export const checkAuthRateLimit: AuthRateLimiter =
	env.DRAGONFLY_URL && "redis" in authStore
		? createRedisAuthRateLimiter((authStore as DragonflyAuthStore).redis)
		: createMemoryAuthRateLimiter();
