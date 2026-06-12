import type { PlanId } from "@filosign/entitlements";
import { throwAppError } from "@filosign/errors/server";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { invalidateUserEntitlements } from "@/lib/platform/cache";
import db from "@/lib/platform/db";
import { userSubscriptions } from "@/lib/platform/db/schema/billing";
import {
	platformInviteRedemptions,
	platformInvites,
} from "@/lib/platform/db/schema/platform-access";
import { users } from "@/lib/platform/db/schema/user";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
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
}) {
	const token = generatePlatformInviteToken();
	const [row] = await db
		.insert(platformInvites)
		.values({
			token,
			kind: args.kind,
			planId: args.planId,
			trialDays: args.trialDays ?? 30,
			email: args.email?.trim().toLowerCase() || null,
			featureOverrides: args.featureOverrides ?? {},
			maxRedemptions: args.maxRedemptions ?? 1,
			expiresAt: args.expiresAt ?? null,
			createdByAdminWallet: getAddress(args.adminWallet),
			note: args.note?.trim() || null,
		})
		.returning();

	if (!row) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "Failed to create invite",
		});
	}

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
	});
}

export async function listPlatformInvites() {
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
			createdAt: platformInvites.createdAt,
		})
		.from(platformInvites)
		.orderBy(sql`${platformInvites.createdAt} desc`);

	const redemptions = await db
		.select({
			inviteId: platformInviteRedemptions.inviteId,
			walletAddress: platformInviteRedemptions.walletAddress,
			email: platformInviteRedemptions.email,
			redeemedAt: platformInviteRedemptions.redeemedAt,
		})
		.from(platformInviteRedemptions);

	const byInvite = new Map<string, typeof redemptions>();
	for (const r of redemptions) {
		const list = byInvite.get(r.inviteId) ?? [];
		list.push(r);
		byInvite.set(r.inviteId, list);
	}

	return rows.map((row) => ({
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
}

export async function listPlatformUsersForAdmin() {
	const rows = await db
		.select({
			walletAddress: users.walletAddress,
			email: users.email,
			createdAt: users.createdAt,
			planId: userSubscriptions.planId,
			status: userSubscriptions.status,
			periodEnd: userSubscriptions.periodEnd,
			featureOverrides: userSubscriptions.featureOverrides,
		})
		.from(users)
		.leftJoin(
			userSubscriptions,
			eq(users.walletAddress, userSubscriptions.walletAddress),
		)
		.orderBy(sql`${users.createdAt} desc`)
		.limit(500);

	return rows.map((row) => ({
		walletAddress: row.walletAddress,
		email: row.email,
		createdAt: row.createdAt.toISOString(),
		planId: row.planId ?? "free",
		status: row.status ?? "active",
		periodEnd: row.periodEnd?.toISOString() ?? null,
		featureOverrides: row.featureOverrides ?? {},
	}));
}

export async function setUserFeatureOverrides(args: {
	wallet: Address;
	featureOverrides: Record<string, number | boolean>;
}) {
	const wallet = getAddress(args.wallet);
	const res = await tryCatch(
		db
			.update(userSubscriptions)
			.set({
				featureOverrides: args.featureOverrides,
				updatedAt: new Date(),
			})
			.where(eq(userSubscriptions.walletAddress, wallet)),
	);
	if (res.error) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "Failed to update overrides",
		});
	}
	await invalidateUserEntitlements(wallet);
}

export async function setUserPlanManual(args: {
	wallet: Address;
	planId: PlanId;
	status?: "active" | "trialing" | "canceled";
	periodEnd?: Date | null;
}) {
	const wallet = getAddress(args.wallet);
	await db
		.insert(userSubscriptions)
		.values({
			walletAddress: wallet,
			planId: args.planId,
			status: args.status ?? "active",
			provider: "manual",
			periodStart: new Date(),
			periodEnd: args.periodEnd ?? null,
		})
		.onConflictDoUpdate({
			target: userSubscriptions.walletAddress,
			set: {
				planId: args.planId,
				status: args.status ?? "active",
				provider: "manual",
				periodEnd: args.periodEnd ?? null,
				updatedAt: new Date(),
			},
		});
	await invalidateUserEntitlements(wallet);
}
