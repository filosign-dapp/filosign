import {
	type CheckOptions,
	check,
	type EntitlementContext,
	type FeatureKey,
} from "@filosign/entitlements";
import type { AppErrorCode } from "@filosign/errors";
import { throwAppError } from "@filosign/errors/server";
import { sandboxEntitlementsOpen } from "@filosign/shared";
import env from "@/env";

const ENTITLEMENT_REASON_TO_CODE: Record<string, AppErrorCode> = {
	FEATURE_DISABLED: "ENTITLEMENT.FEATURE_DISABLED",
	QUOTA_EXCEEDED: "ENTITLEMENT.QUOTA_EXCEEDED",
	LIMIT_EXCEEDED: "ENTITLEMENT.LIMIT_EXCEEDED",
};

export function assertEntitlement(
	ctx: EntitlementContext,
	key: FeatureKey,
	options?: CheckOptions,
): void {
	if (sandboxEntitlementsOpen(env.DEPLOYMENT)) return;

	const decision = check(ctx, key, options);
	if (decision.allowed) return;

	const reason = decision.reason ?? "FEATURE_DISABLED";
	const appCode =
		ENTITLEMENT_REASON_TO_CODE[reason] ?? "ENTITLEMENT.FEATURE_DISABLED";

	if (
		appCode === "ENTITLEMENT.QUOTA_EXCEEDED" &&
		typeof decision.used === "number" &&
		typeof decision.limit === "number"
	) {
		throwAppError("ENTITLEMENT.QUOTA_EXCEEDED", {
			params: { used: decision.used, limit: decision.limit },
		});
	}

	throwAppError(appCode);
}
