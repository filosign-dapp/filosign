import {
	type CheckOptions,
	catalogEntitlement,
	check,
	DEFAULT_PLAN_ID,
	type EntitlementContext,
	FEATURE_KEYS,
	type FeatureKey,
	getLimit,
	getPlanName,
	type PlanId,
} from "@filosign/entitlements";
import type { AppErrorCode } from "@filosign/errors";
import { throwAppError } from "@filosign/errors/server";
import { sandboxEntitlementsOpen } from "@filosign/shared";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import env from "@/env";
import {
	CACHE_TTL,
	cacheAside,
	cacheKeys,
	defaultDeserialize,
	defaultSerialize,
} from "@/lib/platform/cache";
import db from "@/lib/platform/db";
import { userSubscriptions } from "@/lib/platform/db/schema/billing";
import { files } from "@/lib/platform/db/schema/file";
import { organizationSubscriptions } from "@/lib/platform/db/schema/organization";

export function calendarMonthPeriod(now = new Date()): {
	periodStart: Date;
	periodEnd: Date;
} {
	const periodStart = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
	);
	const periodEnd = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
	);
	return { periodStart, periodEnd };
}

export type SubscriptionAccessInput = {
	planId: PlanId;
	status: string;
	cancelAtPeriodEnd?: boolean;
	periodEnd?: Date | null;
};

export function effectivePlanIdFromStatus(
	sub: SubscriptionAccessInput | undefined,
	now = new Date(),
): PlanId {
	if (!sub) return DEFAULT_PLAN_ID;

	if (sub.status === "active" || sub.status === "trialing") {
		return sub.planId;
	}

	if (
		sub.cancelAtPeriodEnd &&
		sub.periodEnd &&
		sub.periodEnd.getTime() > now.getTime()
	) {
		return sub.planId;
	}

	// Payment retry window — keep plan while Dodo marks subscription on_hold.
	if (sub.status === "past_due") {
		return sub.planId;
	}

	return DEFAULT_PLAN_ID;
}

export function recipientSlotCounts(args: {
	participants: { isSigner?: boolean | undefined }[];
	coldInvites: { isSigner: boolean }[];
}) {
	const warmParticipantCount = args.participants.length;
	const coldInviteCount = args.coldInvites.length;
	const recipientSlotCount = warmParticipantCount + coldInviteCount;
	const signerSlotCount =
		args.participants.filter((p) => p.isSigner).length +
		args.coldInvites.filter((c) => c.isSigner).length;

	return {
		warmParticipantCount,
		coldInviteCount,
		recipientSlotCount,
		signerSlotCount,
	};
}

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
	planName: string;
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
		planName: getPlanName(ctx.planId),
		limits,
		features,
	};
}

type StoredEntitlementContext = Omit<EntitlementContext, "periodStart"> & {
	periodStart: string;
};

function serializeEntitlementContext(ctx: EntitlementContext): string {
	const stored: StoredEntitlementContext = {
		...ctx,
		periodStart: ctx.periodStart.toISOString(),
	};
	return defaultSerialize(stored);
}

function deserializeEntitlementContext(raw: string): EntitlementContext {
	const stored = defaultDeserialize<StoredEntitlementContext>(raw);
	return {
		...stored,
		periodStart: new Date(stored.periodStart),
	};
}

function withOrgMemberWallet(
	ctx: EntitlementContext,
	walletNorm: Address,
	organizationId: string,
): EntitlementContext {
	return {
		...ctx,
		subject: {
			type: "org_member",
			orgId: organizationId,
			wallet: walletNorm,
		},
	};
}

export async function fetchEntitlementContext(
	wallet: Address,
	organizationId?: string | null,
): Promise<EntitlementContext> {
	const walletNorm = getAddress(wallet);
	const { periodStart, periodEnd } = calendarMonthPeriod();
	const [sub] = await db
		.select({
			planId: userSubscriptions.planId,
			status: userSubscriptions.status,
			cancelAtPeriodEnd: userSubscriptions.cancelAtPeriodEnd,
			periodEnd: userSubscriptions.periodEnd,
			featureOverrides: userSubscriptions.featureOverrides,
		})
		.from(userSubscriptions)
		.where(eq(userSubscriptions.walletAddress, walletNorm))
		.limit(1);

	const userAccessInput = sub
		? {
				planId: sub.planId as PlanId,
				status: sub.status,
				cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
				periodEnd: sub.periodEnd,
			}
		: undefined;
	const userPlanId = effectivePlanIdFromStatus(userAccessInput);
	const userOverrides =
		sub && userPlanId === (sub.planId as PlanId) && userPlanId !== "free"
			? sub.featureOverrides
			: undefined;

	let planId: PlanId = userPlanId;
	let overrides = userOverrides;
	let subject: EntitlementContext["subject"] = {
		type: "user",
		wallet: walletNorm,
	};

	let seatCount: number | undefined;
	if (organizationId) {
		const [orgSub] = await db
			.select({
				planId: organizationSubscriptions.planId,
				status: organizationSubscriptions.status,
				seatCount: organizationSubscriptions.seatCount,
				cancelAtPeriodEnd: organizationSubscriptions.cancelAtPeriodEnd,
				periodEnd: organizationSubscriptions.periodEnd,
				featureOverrides: organizationSubscriptions.featureOverrides,
			})
			.from(organizationSubscriptions)
			.where(eq(organizationSubscriptions.organizationId, organizationId))
			.limit(1);

		const orgAccessInput = orgSub
			? {
					planId: orgSub.planId as PlanId,
					status: orgSub.status,
					cancelAtPeriodEnd: orgSub.cancelAtPeriodEnd,
					periodEnd: orgSub.periodEnd,
				}
			: undefined;
		const orgPlanId: PlanId = effectivePlanIdFromStatus(orgAccessInput);
		const orgOverrides =
			orgSub && orgPlanId === (orgSub.planId as PlanId) && orgPlanId !== "free"
				? (orgSub.featureOverrides as EntitlementContext["overrides"])
				: undefined;

		planId = orgPlanId;
		overrides = orgOverrides;

		if (
			planId === "teams" ||
			planId === "teams_pro" ||
			planId === "individual"
		) {
			seatCount = planId === "individual" ? 1 : (orgSub?.seatCount ?? 1);
		}

		subject = {
			type: "org_member",
			orgId: organizationId,
			wallet: walletNorm,
		};
	}

	const docQuotaDef = catalogEntitlement(planId, "documents.sent.monthly");
	const lifetimeDocQuota =
		docQuotaDef.kind === "quota" && docQuotaDef.period === "lifetime";
	const periodFilters = lifetimeDocQuota
		? []
		: [gte(files.createdAt, periodStart), lt(files.createdAt, periodEnd)];

	const [{ count }] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(files)
		.where(
			and(
				organizationId
					? and(
							eq(files.organizationId, organizationId),
							eq(files.isPractice, false),
						)
					: and(eq(files.sender, walletNorm), eq(files.isPractice, false)),
				...periodFilters,
			),
		);

	const usage: Partial<Record<FeatureKey, number>> = {
		"documents.sent.monthly": count ?? 0,
	};

	return {
		subject,
		planId,
		periodStart,
		usage,
		overrides,
		seatCount,
	};
}

export async function resolveEntitlementContext(
	wallet: Address,
	organizationId?: string | null,
): Promise<EntitlementContext> {
	const walletNorm = getAddress(wallet);
	const orgId = organizationId?.trim() || null;

	if (orgId) {
		const ctx = await cacheAside({
			key: cacheKeys.orgEntitlements(orgId),
			ttlSec: CACHE_TTL.orgEntitlements,
			fetch: () => fetchEntitlementContext(wallet, orgId),
			serialize: serializeEntitlementContext,
			deserialize: deserializeEntitlementContext,
		});
		return withOrgMemberWallet(ctx, walletNorm, orgId);
	}

	return cacheAside({
		key: cacheKeys.userEntitlements(walletNorm),
		ttlSec: CACHE_TTL.userEntitlements,
		fetch: () => fetchEntitlementContext(wallet, null),
		serialize: serializeEntitlementContext,
		deserialize: deserializeEntitlementContext,
	});
}
