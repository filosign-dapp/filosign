import { z } from "zod";
import type { FeatureKey } from "./features";

export const PLAN_IDS = [
	"free",
	"individual",
	"teams",
	"teams_pro",
	"enterprise",
] as const;

export type PlanId = (typeof PLAN_IDS)[number];

export const zPlanId = z.enum(PLAN_IDS);

export type EntitlementSubject =
	| { type: "user"; wallet: string }
	| { type: "org_member"; orgId: string; wallet: string };

export type QuotaScope = "account" | "per_seat";

export type QuotaPeriod = "calendar_month";

export type QuotaEntitlementDef = {
	kind: "quota";
	/** `null` = no catalog cap (enterprise); resolve via `context.overrides`. */
	limit: number | null;
	period: QuotaPeriod;
	scope?: QuotaScope;
};

export type MaxEntitlementDef = {
	kind: "max";
	limit: number | null;
};

export type BooleanEntitlementDef = {
	kind: "boolean";
	enabled: boolean;
};

export type EntitlementDef =
	| QuotaEntitlementDef
	| MaxEntitlementDef
	| BooleanEntitlementDef;

export type PlanEntitlements = Record<FeatureKey, EntitlementDef>;

export type EntitlementContext = {
	subject: EntitlementSubject;
	planId: PlanId;
	periodStart: Date;
	usage: Partial<Record<FeatureKey, number>>;
	/** Paid org seats — multiplies `per_seat` quota limits (Teams / Teams Pro). */
	seatCount?: number;
	/** Per-contract or admin overrides (enterprise, promos). */
	overrides?: Partial<Record<FeatureKey, number | boolean>>;
	/** Server-set: skip catalog limits (non-prod developer bypass). */
	bypass?: boolean;
};

export const ENTITLEMENT_REASONS = [
	"QUOTA_EXCEEDED",
	"LIMIT_EXCEEDED",
	"FEATURE_DISABLED",
] as const;

export type EntitlementReason = (typeof ENTITLEMENT_REASONS)[number];

export type EntitlementDecision = {
	allowed: boolean;
	reason?: EntitlementReason;
	limit?: number | boolean | null;
	used?: number;
	remaining?: number | null;
};

export type CheckOptions = {
	/** For `max` features: recipients (or similar) requested in this action. */
	requested?: number;
};

export type PlanMarketingLine = {
	featureKey: FeatureKey;
	label: string;
};
