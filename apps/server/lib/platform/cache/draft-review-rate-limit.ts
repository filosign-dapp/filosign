import { createHash } from "node:crypto";
import { throwAppError } from "@filosign/errors/server";
import { getRedis } from "./session";

export type DraftReviewRateLimitAction = "list" | "append";

const LIMITS: Record<
	DraftReviewRateLimitAction,
	{ perMinute: number; perDay: number }
> = {
	list: { perMinute: 30, perDay: 200 },
	append: { perMinute: 10, perDay: 50 },
};

const MINUTE_TTL_SEC = 60;
const DAY_TTL_SEC = 86_400;

function rateLimitKey(
	scope: "m" | "d",
	action: DraftReviewRateLimitAction,
	inviteToken: string,
	clientIp: string,
): string {
	const tokenHash = createHash("sha256").update(inviteToken).digest("hex");
	const ipHash = createHash("sha256").update(clientIp).digest("hex");
	return `fs:draft-review-rl:${action}:${scope}:${tokenHash}:${ipHash}`;
}

export async function assertDraftReviewPublicRateLimit(args: {
	action: DraftReviewRateLimitAction;
	inviteToken: string;
	clientIp: string;
}): Promise<void> {
	const limits = LIMITS[args.action];
	const r = getRedis();

	const minuteKey = rateLimitKey(
		"m",
		args.action,
		args.inviteToken,
		args.clientIp,
	);
	const minuteCount = await r.incr(minuteKey);
	if (minuteCount === 1) await r.expire(minuteKey, MINUTE_TTL_SEC);
	if (minuteCount > limits.perMinute) {
		throwAppError("DRAFTS.RATE_LIMITED");
	}

	const dayKey = rateLimitKey(
		"d",
		args.action,
		args.inviteToken,
		args.clientIp,
	);
	const dayCount = await r.incr(dayKey);
	if (dayCount === 1) await r.expire(dayKey, DAY_TTL_SEC);
	if (dayCount > limits.perDay) {
		throwAppError("DRAFTS.RATE_LIMITED");
	}
}
