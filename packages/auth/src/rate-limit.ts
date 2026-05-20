import { MINUTE_MS } from "./constants";
import { authRedisKeys } from "./store/keys";
import type { AuthRedis } from "./store/redis-client";

const LIMITS = {
	"auth.nonce": { max: 30, windowMs: MINUTE_MS },
	"auth.verify": { max: 20, windowMs: MINUTE_MS },
	"auth.refresh": { max: 60, windowMs: MINUTE_MS },
	"auth.logout": { max: 30, windowMs: MINUTE_MS },
} as const;

export type AuthRateLimitKey = keyof typeof LIMITS;

export type AuthRateLimitResult = {
	allowed: boolean;
	retryAfterMs?: number;
};

export type AuthRateLimiter = (
	route: AuthRateLimitKey,
	id: string,
) => Promise<AuthRateLimitResult> | AuthRateLimitResult;

type Bucket = { count: number; resetAt: number };

export function createMemoryAuthRateLimiter(): AuthRateLimiter {
	const buckets = new Map<string, Bucket>();

	return (route, id) => {
		const limit = LIMITS[route];
		const key = `${route}:${id}`;
		const now = Date.now();
		let bucket = buckets.get(key);

		if (!bucket || now >= bucket.resetAt) {
			bucket = { count: 0, resetAt: now + limit.windowMs };
			buckets.set(key, bucket);
		}

		bucket.count += 1;
		if (bucket.count > limit.max) {
			return { allowed: false, retryAfterMs: bucket.resetAt - now };
		}
		return { allowed: true };
	};
}

export function createRedisAuthRateLimiter(redis: AuthRedis): AuthRateLimiter {
	return async (route, id) => {
		const limit = LIMITS[route];
		const key = authRedisKeys.rateLimit(route, id);
		const count = await redis.incr(key);
		if (count === 1) {
			const ttlSec = Math.max(1, Math.ceil(limit.windowMs / 1000));
			await redis.expire(key, ttlSec);
		}
		const ttlMs = await redis.ttlMs(key);
		if (count > limit.max) {
			return {
				allowed: false,
				retryAfterMs: ttlMs > 0 ? ttlMs : limit.windowMs,
			};
		}
		return { allowed: true };
	};
}
