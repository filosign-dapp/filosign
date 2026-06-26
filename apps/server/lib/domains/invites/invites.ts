import { and, eq, gt, sql } from "drizzle-orm";
import env from "@/env";
import db from "@/lib/platform/db";
import type { OrgMemberRole } from "@/lib/platform/db/schema/organization";

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

export type OrgInvitePreview =
	| {
			valid: true;
			lockedEmail: string;
			orgName: string;
			role: OrgMemberRole;
			expiresAt: Date;
	  }
	| {
			valid: false;
			reason: string;
	  };

export async function previewOrgInvite(args: {
	token: string;
}): Promise<OrgInvitePreview> {
	const token = args.token.trim();
	if (token.length < 16) {
		return { valid: false, reason: "Invalid invite link" };
	}

	const [row] = await db
		.select({
			email: db.schema.organizationInvites.email,
			role: db.schema.organizationInvites.role,
			expiresAt: db.schema.organizationInvites.expiresAt,
			orgName: db.schema.organizations.name,
		})
		.from(db.schema.organizationInvites)
		.innerJoin(
			db.schema.organizations,
			eq(
				db.schema.organizations.id,
				db.schema.organizationInvites.organizationId,
			),
		)
		.where(
			and(
				eq(db.schema.organizationInvites.token, token),
				pendingOrgInviteFilter(),
			),
		)
		.limit(1);

	if (!row) {
		return { valid: false, reason: "Invite not found or expired" };
	}

	return {
		valid: true,
		lockedEmail: row.email,
		orgName: row.orgName,
		role: row.role as OrgMemberRole,
		expiresAt: row.expiresAt,
	};
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
