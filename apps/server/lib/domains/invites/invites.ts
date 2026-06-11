import { and, eq, gt, sql } from "drizzle-orm";
import env from "@/env";
import db from "@/lib/platform/db";

export type ExpireInvitesResult = {
	fileCold: {
		expiredCount: number;
		rows: { id: string; filePieceCid: string }[];
	};
	org: { expiredCount: number; rows: { id: string; organizationId: string }[] };
};

export function inviteTtlDays(): number {
	return env.INVITE_TTL_DAYS;
}

export function inviteTtlMs(): number {
	return inviteTtlDays() * 24 * 60 * 60 * 1000;
}

export function inviteExpiresAt(from = Date.now()): Date {
	return new Date(from + inviteTtlMs());
}

/** Pending and not past `expiresAt` (document / cold invite). */
export function pendingFileColdInviteFilter(now = new Date()) {
	return and(
		eq(db.schema.fileColdInvites.status, "pending"),
		gt(db.schema.fileColdInvites.expiresAt, now),
	);
}

/** Pending and not past `expiresAt` (org invite). */
export function pendingOrgInviteFilter(now = new Date()) {
	return and(
		eq(db.schema.organizationInvites.status, "pending"),
		gt(db.schema.organizationInvites.expiresAt, now),
	);
}

/** Mark document and org invites past `expiresAt` as `expired` (hourly cron). */
export async function expireAllPendingInvites(): Promise<ExpireInvitesResult> {
	const now = new Date();

	const fileColdRows = await db
		.update(db.schema.fileColdInvites)
		.set({ status: "expired", updatedAt: now })
		.where(
			and(
				eq(db.schema.fileColdInvites.status, "pending"),
				sql`${db.schema.fileColdInvites.expiresAt} < ${now}`,
			),
		)
		.returning({
			id: db.schema.fileColdInvites.id,
			filePieceCid: db.schema.fileColdInvites.filePieceCid,
		});

	const orgRows = await db
		.update(db.schema.organizationInvites)
		.set({ status: "expired", token: null, updatedAt: now })
		.where(
			and(
				eq(db.schema.organizationInvites.status, "pending"),
				sql`${db.schema.organizationInvites.expiresAt} < ${now}`,
			),
		)
		.returning({
			id: db.schema.organizationInvites.id,
			organizationId: db.schema.organizationInvites.organizationId,
		});

	return {
		fileCold: { expiredCount: fileColdRows.length, rows: fileColdRows },
		org: { expiredCount: orgRows.length, rows: orgRows },
	};
}
