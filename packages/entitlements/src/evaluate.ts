import { catalogEntitlement } from "./catalog";
import type { FeatureKey } from "./features";
import {
	featureKind,
	isBooleanFeatureKey,
	isMaxFeatureKey,
	isQuotaFeatureKey,
} from "./features";
import type {
	CheckOptions,
	EntitlementContext,
	EntitlementDecision,
	EntitlementDef,
	PlanId,
} from "./types";

function overrideFor(
	ctx: EntitlementContext,
	key: FeatureKey,
): number | boolean | undefined {
	return ctx.overrides?.[key];
}

function effectiveNumericLimit(
	defLimit: number | null,
	override: number | boolean | undefined,
): number | null {
	if (typeof override === "number") return override;
	if (override === true) return null;
	if (override === false) return 0;
	return defLimit;
}

function effectiveBoolean(
	defEnabled: boolean,
	override: number | boolean | undefined,
): boolean {
	if (typeof override === "boolean") return override;
	if (typeof override === "number") return override > 0;
	return defEnabled;
}

function resolveDef(ctx: EntitlementContext, key: FeatureKey): EntitlementDef {
	return catalogEntitlement(ctx.planId, key);
}

/** Resolved limit for a feature (catalog + overrides). Booleans return enabled state. */
export function getLimit(
	ctx: EntitlementContext,
	key: FeatureKey,
): number | boolean | null {
	const def = resolveDef(ctx, key);
	const override = overrideFor(ctx, key);

	if (def.kind === "boolean") {
		return effectiveBoolean(def.enabled, override);
	}

	return effectiveNumericLimit(def.limit, override);
}

export function getQuotaScope(ctx: EntitlementContext, key: FeatureKey) {
	const def = resolveDef(ctx, key);
	if (def.kind !== "quota") return undefined;
	return def.scope ?? "account";
}

function effectiveQuotaLimit(
	ctx: EntitlementContext,
	def: Extract<EntitlementDef, { kind: "quota" }>,
	key: FeatureKey,
): number | null {
	const limit = effectiveNumericLimit(def.limit, overrideFor(ctx, key));
	if (limit === null) return null;
	const scope = def.scope ?? "account";
	if (scope === "per_seat") {
		return limit * Math.max(1, ctx.seatCount ?? 1);
	}
	return limit;
}

function checkQuota(
	ctx: EntitlementContext,
	key: FeatureKey,
	def: Extract<EntitlementDef, { kind: "quota" }>,
): EntitlementDecision {
	const limit = effectiveQuotaLimit(ctx, def, key);
	const used = ctx.usage[key] ?? 0;

	if (limit === null) {
		return { allowed: true, limit: null, used, remaining: null };
	}

	const remaining = Math.max(0, limit - used);
	const allowed = used < limit;

	return {
		allowed,
		reason: allowed ? undefined : "QUOTA_EXCEEDED",
		limit,
		used,
		remaining,
	};
}

function checkMax(
	ctx: EntitlementContext,
	key: FeatureKey,
	def: Extract<EntitlementDef, { kind: "max" }>,
	options?: CheckOptions,
): EntitlementDecision {
	const limit = effectiveNumericLimit(def.limit, overrideFor(ctx, key));
	const requested = options?.requested;

	if (limit === null) {
		return { allowed: true, limit: null, remaining: null };
	}

	if (requested === undefined) {
		return { allowed: true, limit, remaining: limit };
	}

	const allowed = requested <= limit;
	return {
		allowed,
		reason: allowed ? undefined : "LIMIT_EXCEEDED",
		limit,
		used: requested,
		remaining: Math.max(0, limit - requested),
	};
}

function checkBoolean(
	ctx: EntitlementContext,
	key: FeatureKey,
	def: Extract<EntitlementDef, { kind: "boolean" }>,
): EntitlementDecision {
	const enabled = effectiveBoolean(def.enabled, overrideFor(ctx, key));
	return {
		allowed: enabled,
		reason: enabled ? undefined : "FEATURE_DISABLED",
		limit: enabled,
	};
}

/** Whether `ctx` may use `key` (optional `requested` for per-action max checks). */
export function check(
	ctx: EntitlementContext,
	key: FeatureKey,
	options?: CheckOptions,
): EntitlementDecision {
	if (ctx.bypass) {
		return { allowed: true, limit: null, remaining: null };
	}

	const def = resolveDef(ctx, key);

	if (isQuotaFeatureKey(key) && def.kind === "quota") {
		return checkQuota(ctx, key, def);
	}
	if (isMaxFeatureKey(key) && def.kind === "max") {
		return checkMax(ctx, key, def, options);
	}
	if (isBooleanFeatureKey(key) && def.kind === "boolean") {
		return checkBoolean(ctx, key, def);
	}

	throw new Error(
		`Feature ${key} kind mismatch (catalog ${def.kind}, expected ${featureKind(key)})`,
	);
}

export function assertAllowed(
	ctx: EntitlementContext,
	key: FeatureKey,
	options?: CheckOptions,
): void {
	const decision = check(ctx, key, options);
	if (!decision.allowed) {
		const reason = decision.reason ?? "FEATURE_DISABLED";
		throw new Error(`${reason}: ${key}`);
	}
}

/** Default plan when no subscription row exists (server resolver will use this). */
export const DEFAULT_PLAN_ID: PlanId = "free";

export function defaultPlanContext(
	partial: Pick<EntitlementContext, "subject"> &
		Partial<Omit<EntitlementContext, "subject" | "planId">>,
): EntitlementContext {
	return {
		planId: DEFAULT_PLAN_ID,
		periodStart: new Date(),
		usage: {},
		...partial,
		subject: partial.subject,
	};
}
