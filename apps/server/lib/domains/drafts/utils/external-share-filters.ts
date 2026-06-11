import { and, isNull, or, sql } from "drizzle-orm";
import db from "@/lib/platform/db";

const { draftExternalShares } = db.schema;

export function pendingDraftShareFilter() {
	return and(
		isNull(draftExternalShares.revokedAt),
		or(
			isNull(draftExternalShares.expiresAt),
			sql`${draftExternalShares.expiresAt} > now()`,
		),
	);
}
