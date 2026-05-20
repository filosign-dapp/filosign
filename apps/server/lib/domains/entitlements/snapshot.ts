import {
	check,
	type EntitlementContext,
	FEATURE_KEYS,
	type FeatureKey,
	getLimit,
} from "@filosign/entitlements";

const METERED_KEYS = [
	"documents.sent.monthly",
	"envelope.recipients.max",
] as const satisfies FeatureKey[];

export type EntitlementLimitSnapshot = {
	limit: number | boolean | null;
	used?: number;
	remaining?: number | null;
	allowed: boolean;
};

export function buildEntitlementsSnapshot(ctx: EntitlementContext): {
	planId: typeof ctx.planId;
	limits: Record<(typeof METERED_KEYS)[number], EntitlementLimitSnapshot>;
	features: Record<FeatureKey, { enabled: boolean }>;
} {
	const limits = {} as Record<
		(typeof METERED_KEYS)[number],
		EntitlementLimitSnapshot
	>;

	for (const key of METERED_KEYS) {
		const decision = check(ctx, key);
		limits[key] = {
			limit: decision.limit ?? getLimit(ctx, key),
			used: decision.used,
			remaining: decision.remaining,
			allowed: decision.allowed,
		};
	}

	const features = {} as Record<FeatureKey, { enabled: boolean }>;
	for (const key of FEATURE_KEYS) {
		if (key === "documents.sent.monthly" || key === "envelope.recipients.max") {
			continue;
		}
		const decision = check(ctx, key);
		features[key] = { enabled: decision.allowed };
	}

	return {
		planId: ctx.planId,
		limits,
		features,
	};
}
