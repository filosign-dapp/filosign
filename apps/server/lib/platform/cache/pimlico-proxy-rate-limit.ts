import { createHash } from "node:crypto";
import type { Address } from "viem";
import {
	JSON_RPC_ERROR_CODES,
	type JsonRpcId,
	makeJsonRpcError,
	PimlicoProxyError,
} from "../pimlico-proxy/jsonrpc";
import { getRedis } from "./session";

const LIMITS = {
	perMinute: 30,
	perDay: 300,
} as const;

const MINUTE_TTL_SEC = 60;
const DAY_TTL_SEC = 86_400;

function rateLimitKey(
	scope: "m" | "d",
	sender: Address,
	clientIp: string,
): string {
	const senderHash = createHash("sha256").update(sender).digest("hex");
	const ipHash = createHash("sha256").update(clientIp).digest("hex");
	return `fs:pimlico-proxy-rl:${scope}:${senderHash}:${ipHash}`;
}

export async function assertPimlicoProxyRateLimit(args: {
	sender: Address;
	clientIp: string;
	requestId: JsonRpcId;
}): Promise<void> {
	const r = getRedis();

	const minuteKey = rateLimitKey("m", args.sender, args.clientIp);
	const minuteCount = await r.incr(minuteKey);
	if (minuteCount === 1) await r.expire(minuteKey, MINUTE_TTL_SEC);
	if (minuteCount > LIMITS.perMinute) {
		throw new PimlicoProxyError(
			makeJsonRpcError(
				args.requestId,
				JSON_RPC_ERROR_CODES.rateLimited,
				"Gas sponsorship rate limit exceeded",
			),
			429,
		);
	}

	const dayKey = rateLimitKey("d", args.sender, args.clientIp);
	const dayCount = await r.incr(dayKey);
	if (dayCount === 1) await r.expire(dayKey, DAY_TTL_SEC);
	if (dayCount > LIMITS.perDay) {
		throw new PimlicoProxyError(
			makeJsonRpcError(
				args.requestId,
				JSON_RPC_ERROR_CODES.rateLimited,
				"Gas sponsorship rate limit exceeded",
			),
			429,
		);
	}
}
