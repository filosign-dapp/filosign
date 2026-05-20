import {
	type CheckOptions,
	check,
	type EntitlementContext,
	type FeatureKey,
} from "@filosign/entitlements";
import { ORPCError } from "@orpc/server";

export function assertEntitlement(
	ctx: EntitlementContext,
	key: FeatureKey,
	options?: CheckOptions,
): void {
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
