import {
	type CheckOptions,
	check,
	type EntitlementContext,
	type FeatureKey,
} from "@filosign/entitlements";
import { sandboxEntitlementsOpen } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import env from "@/env";

export function assertEntitlement(
	ctx: EntitlementContext,
	key: FeatureKey,
	options?: CheckOptions,
): void {
	if (sandboxEntitlementsOpen(env.DEPLOYMENT)) return;

	const decision = check(ctx, key, options);
	if (decision.allowed) return;

	throw new ORPCError("FORBIDDEN", {
		message: decision.reason ?? "FEATURE_DISABLED",
		data: {
			code: decision.reason ?? "FEATURE_DISABLED",
			feature: key,
			limit: decision.limit,
			used: decision.used,
			remaining: decision.remaining,
		},
	});
}
