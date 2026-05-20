import { and, eq, gt } from "drizzle-orm";
import db from "@/lib/platform/db";

const { fileColdInvites, organizationInvites, userInvites } = db.schema;

/** Pending and not past `expiresAt` (document / cold invite). */
export function pendingFileColdInviteFilter(now = new Date()) {
	return and(
		eq(fileColdInvites.status, "pending"),
		gt(fileColdInvites.expiresAt, now),
	);
}

/** Pending and not past `expiresAt` (org invite). */
export function pendingOrgInviteFilter(now = new Date()) {
	return and(
		eq(organizationInvites.status, "pending"),
		gt(organizationInvites.expiresAt, now),
	);
}

/** Pending and not past `expiresAt` (user / sharing email invite). */
export function pendingUserInviteFilter(now = new Date()) {
	return and(eq(userInvites.status, "pending"), gt(userInvites.expiresAt, now));
}
