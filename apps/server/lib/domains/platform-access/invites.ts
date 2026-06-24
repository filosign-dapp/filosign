import type { PlanId } from "@filosign/entitlements";
import { throwAppError } from "@filosign/errors/server";
import {
	DEFAULT_PARTNER_TRIAL_DAYS,
	type PlatformInviteEmailVariant,
} from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import type { SQL } from "drizzle-orm";
import {
	and,
	count,
	eq,
	ilike,
	inArray,
	isNotNull,
	isNull,
	lt,
	or,
	sql,
} from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { getPersonalOrganizationId } from "@/lib/domains/orgs/workspace";
import { trackPlatformInviteCreated } from "@/lib/platform/analytics";
import { invalidateOrgEntitlements } from "@/lib/platform/cache";
import db from "@/lib/platform/db";
import {
	organizationMembers,
	organizationSubscriptions,
	organizations,
} from "@/lib/platform/db/schema/organization";
import {
	platformInviteRedemptions,
	platformInvites,
} from "@/lib/platform/db/schema/platform-access";
import { users } from "@/lib/platform/db/schema/user";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { setOrgPlanManualWithTx } from "./grants";
import { adminListMeta, adminListOffset } from "./utils/admin-pagination";
import { generatePlatformInviteToken } from "./utils/shared";

export async function createPlatformInvite(args: {
	adminWallet: Address;
	kind: "partner_trial" | "manual_paid";
	planId: PlanId;
	trialDays?: number;
	email?: string | null;
	featureOverrides?: Record<string, number | boolean>;
	maxRedemptions?: number;
	expiresAt?: Date | null;
	note?: string | null;
	emailBody?: string | null;
	emailVariant?: PlatformInviteEmailVariant;
}) {
	const token = generatePlatformInviteToken();
	const [row] = await db
		.insert(platformInvites)
		.values({
			token,
			kind: args.kind,
			planId: args.planId,
			trialDays: args.trialDays ?? DEFAULT_PARTNER_TRIAL_DAYS,
			email: args.email?.trim().toLowerCase() || null,
			featureOverrides: args.featureOverrides ?? {},
			maxRedemptions: args.maxRedemptions ?? 1,
			expiresAt: args.expiresAt ?? null,
			createdByAdminWallet: getAddress(args.adminWallet),
			note: args.note?.trim() || null,
			emailBody: args.emailBody?.trim() || null,
			emailVariant: args.emailVariant ?? "warm",
		})
		.returning();

	if (!row) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "Failed to create invite",
		});
	}

	trackPlatformInviteCreated({
		adminWallet: row.createdByAdminWallet,
		inviteId: row.id,
		emailVariant: row.emailVariant,
		planId: row.planId,
		trialDays: row.trialDays,
		inviteKind: row.kind,
	});

	return row;
}

export async function getPlatformInviteById(inviteId: string) {
	const [row] = await db
		.select()
		.from(platformInvites)
		.where(eq(platformInvites.id, inviteId))
		.limit(1);
	return row ?? null;
}

export async function revokePlatformInvite(inviteId: string): Promise<void> {
	await db
		.update(platformInvites)
		.set({ revokedAt: new Date(), updatedAt: new Date() })
		.where(
			and(eq(platformInvites.id, inviteId), isNull(platformInvites.revokedAt)),
		);
}

export async function rebookPlatformInvite(args: {
	adminWallet: Address;
	inviteId: string;
}) {
	const [old] = await db
		.select()
		.from(platformInvites)
		.where(eq(platformInvites.id, args.inviteId))
		.limit(1);
	if (!old) {
		throwAppError("WORKSPACE.PLATFORM_INVITE_NOT_FOUND");
	}

	await revokePlatformInvite(old.id);

	return createPlatformInvite({
		adminWallet: args.adminWallet,
		kind: old.kind,
		planId: old.planId as PlanId,
		trialDays: old.trialDays,
		email: old.email,
		featureOverrides: old.featureOverrides ?? {},
		maxRedemptions: old.maxRedemptions,
		expiresAt: old.expiresAt,
		note: old.note,
		emailBody: old.emailBody,
		emailVariant: old.emailVariant,
	});
}

export async function listPlatformInvites(args?: {
	page?: number;
	q?: string;
	status?: "all" | "active" | "revoked" | "expired";
}) {
	const { safePage, offset, pageSize } = adminListOffset(args?.page);
	const now = new Date();
	const filters: SQL[] = [];

	const q = args?.q?.trim();
	if (q) {
		const pattern = `%${q}%`;
		filters.push(
			or(
				ilike(platformInvites.email, pattern),
				ilike(platformInvites.note, pattern),
			)!,
		);
	}

	const status = args?.status ?? "all";
	if (status === "revoked") {
		filters.push(isNotNull(platformInvites.revokedAt));
	} else if (status === "expired") {
		filters.push(
			and(
				isNull(platformInvites.revokedAt),
				isNotNull(platformInvites.expiresAt),
				lt(platformInvites.expiresAt, now),
			)!,
		);
	} else if (status === "active") {
		filters.push(
			and(
				isNull(platformInvites.revokedAt),
				sql`${platformInvites.redemptionCount} < ${platformInvites.maxRedemptions}`,
				or(
					isNull(platformInvites.expiresAt),
					sql`${platformInvites.expiresAt} > ${now}`,
				)!,
			)!,
		);
	}

	const where = filters.length > 0 ? and(...filters) : undefined;

	const [countRow] = await db
		.select({ total: count() })
		.from(platformInvites)
		.where(where);

	const totalCount = countRow?.total ?? 0;
	const meta = adminListMeta(totalCount, safePage);

	const rows = await db
		.select({
			id: platformInvites.id,
			token: platformInvites.token,
			kind: platformInvites.kind,
			email: platformInvites.email,
			planId: platformInvites.planId,
			trialDays: platformInvites.trialDays,
			featureOverrides: platformInvites.featureOverrides,
			maxRedemptions: platformInvites.maxRedemptions,
			redemptionCount: platformInvites.redemptionCount,
			expiresAt: platformInvites.expiresAt,
			revokedAt: platformInvites.revokedAt,
			note: platformInvites.note,
			emailBody: platformInvites.emailBody,
			emailVariant: platformInvites.emailVariant,
			createdAt: platformInvites.createdAt,
		})
		.from(platformInvites)
		.where(where)
		.orderBy(sql`${platformInvites.createdAt} desc`)
		.limit(pageSize)
		.offset(offset);

	const inviteIds = rows.map((row) => row.id);
	const redemptions =
		inviteIds.length === 0
			? []
			: await db
					.select({
						inviteId: platformInviteRedemptions.inviteId,
						walletAddress: platformInviteRedemptions.walletAddress,
						email: platformInviteRedemptions.email,
						redeemedAt: platformInviteRedemptions.redeemedAt,
					})
					.from(platformInviteRedemptions)
					.where(inArray(platformInviteRedemptions.inviteId, inviteIds));

	const byInvite = new Map<string, typeof redemptions>();
	for (const r of redemptions) {
		const list = byInvite.get(r.inviteId) ?? [];
		list.push(r);
		byInvite.set(r.inviteId, list);
	}

	const items = rows.map((row) => ({
		...row,
		expiresAt: row.expiresAt?.toISOString() ?? null,
		revokedAt: row.revokedAt?.toISOString() ?? null,
		createdAt: row.createdAt.toISOString(),
		redemptions: (byInvite.get(row.id) ?? []).map((r) => ({
			walletAddress: r.walletAddress,
			email: r.email,
			redeemedAt: r.redeemedAt.toISOString(),
		})),
	}));

	return { items, ...meta };
}

export async function listPlatformUsersForAdmin(args?: {
	page?: number;
	q?: string;
	planId?: PlanId;
}) {
	const { safePage, offset, pageSize } = adminListOffset(args?.page);
	const filters: SQL[] = [];

	const q = args?.q?.trim();
	if (q) {
		const pattern = `%${q}%`;
		filters.push(
			or(ilike(users.email, pattern), ilike(users.walletAddress, pattern))!,
		);
	}

	if (args?.planId) {
		filters.push(eq(organizationSubscriptions.planId, args.planId));
	}

	const where = filters.length > 0 ? and(...filters) : undefined;

	const baseQuery = db
		.select({
			walletAddress: users.walletAddress,
			email: users.email,
			createdAt: users.createdAt,
			organizationId: organizations.id,
			planId: organizationSubscriptions.planId,
			status: organizationSubscriptions.status,
			periodEnd: organizationSubscriptions.periodEnd,
			featureOverrides: organizationSubscriptions.featureOverrides,
		})
		.from(users)
		.leftJoin(
			organizationMembers,
			and(
				eq(organizationMembers.walletAddress, users.walletAddress),
				eq(organizationMembers.role, "owner"),
				eq(organizationMembers.status, "active"),
			),
		)
		.leftJoin(
			organizations,
			and(
				eq(organizations.id, organizationMembers.organizationId),
				eq(organizations.isPersonal, true),
			),
		)
		.leftJoin(
			organizationSubscriptions,
			eq(organizationSubscriptions.organizationId, organizations.id),
		);

	const [countRow] = await db
		.select({ total: count() })
		.from(users)
		.leftJoin(
			organizationMembers,
			and(
				eq(organizationMembers.walletAddress, users.walletAddress),
				eq(organizationMembers.role, "owner"),
				eq(organizationMembers.status, "active"),
			),
		)
		.leftJoin(
			organizations,
			and(
				eq(organizations.id, organizationMembers.organizationId),
				eq(organizations.isPersonal, true),
			),
		)
		.leftJoin(
			organizationSubscriptions,
			eq(organizationSubscriptions.organizationId, organizations.id),
		)
		.where(where);

	const totalCount = countRow?.total ?? 0;
	const meta = adminListMeta(totalCount, safePage);

	const rows = await baseQuery
		.where(where)
		.orderBy(sql`${users.createdAt} desc`)
		.limit(pageSize)
		.offset(offset);

	const items = rows.map((row) => ({
		walletAddress: row.walletAddress,
		email: row.email,
		createdAt: row.createdAt.toISOString(),
		planId: row.planId ?? "free",
		status: row.status ?? "active",
		periodEnd: row.periodEnd?.toISOString() ?? null,
		featureOverrides: (row.featureOverrides ?? {}) as Record<
			string,
			number | boolean
		>,
	}));

	return { items, ...meta };
}

async function resolvePersonalOrgId(wallet: Address): Promise<string> {
	const orgId = await getPersonalOrganizationId(wallet);
	if (!orgId) {
		throwAppError("WORKSPACE.ORGANIZATION_NOT_FOUND");
	}
	return orgId;
}

export async function setPersonalOrgFeatureOverrides(args: {
	wallet: Address;
	featureOverrides: Record<string, number | boolean>;
}) {
	const wallet = getAddress(args.wallet);
	const organizationId = await resolvePersonalOrgId(wallet);
	const res = await tryCatch(
		db
			.update(organizationSubscriptions)
			.set({
				featureOverrides: args.featureOverrides,
				updatedAt: new Date(),
			})
			.where(eq(organizationSubscriptions.organizationId, organizationId)),
	);
	if (res.error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "Failed to update overrides",
		});
	}
	await invalidateOrgEntitlements(organizationId);
}

export async function setPersonalOrgPlanManual(args: {
	wallet: Address;
	planId: PlanId;
	status?: "active" | "trialing" | "canceled";
	periodEnd?: Date | null;
}) {
	const wallet = getAddress(args.wallet);
	const organizationId = await resolvePersonalOrgId(wallet);

	await db.transaction(async (tx) => {
		if (args.planId === "teams" || args.planId === "teams_pro") {
			await setOrgPlanManualWithTx(tx, {
				organizationId,
				planId: args.planId,
				seatCount: 1,
				status: args.status ?? "active",
			});
			return;
		}

		await tx
			.update(organizationSubscriptions)
			.set({
				planId: args.planId,
				status: args.status ?? "active",
				provider: "manual",
				periodStart: new Date(),
				periodEnd: args.periodEnd ?? null,
				updatedAt: new Date(),
			})
			.where(eq(organizationSubscriptions.organizationId, organizationId));
	});

	await invalidateOrgEntitlements(organizationId);
}
