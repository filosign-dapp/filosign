import { and, eq, sql } from "drizzle-orm";
import db from "@/lib/platform/db";

const { fileColdInvites, organizationInvites, userInvites } = db.schema;

export type ExpireInvitesResult = {
	fileCold: {
		expiredCount: number;
		rows: { id: string; filePieceCid: string }[];
	};
	org: { expiredCount: number; rows: { id: string; organizationId: string }[] };
	user: { expiredCount: number; rows: { id: string }[] };
};

/** Mark all invite types past `expiresAt` as `expired` (hourly cron). */
export async function expireAllPendingInvites(): Promise<ExpireInvitesResult> {
	const now = new Date();

	const fileColdRows = await db
		.update(fileColdInvites)
		.set({ status: "expired", updatedAt: now })
		.where(
			and(
				eq(fileColdInvites.status, "pending"),
				sql`${fileColdInvites.expiresAt} < ${now}`,
			),
		)
		.returning({
			id: fileColdInvites.id,
			filePieceCid: fileColdInvites.filePieceCid,
		});

	const orgRows = await db
		.update(organizationInvites)
		.set({ status: "expired", token: null, updatedAt: now })
		.where(
			and(
				eq(organizationInvites.status, "pending"),
				sql`${organizationInvites.expiresAt} < ${now}`,
			),
		)
		.returning({
			id: organizationInvites.id,
			organizationId: organizationInvites.organizationId,
		});

	const userRows = await db
		.update(userInvites)
		.set({ status: "expired", updatedAt: now })
		.where(
			and(
				eq(userInvites.status, "pending"),
				sql`${userInvites.expiresAt} < ${now}`,
			),
		)
		.returning({ id: userInvites.id });

	return {
		fileCold: { expiredCount: fileColdRows.length, rows: fileColdRows },
		org: { expiredCount: orgRows.length, rows: orgRows },
		user: { expiredCount: userRows.length, rows: userRows },
	};
}
