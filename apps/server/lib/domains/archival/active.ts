import { and, eq, gt } from "drizzle-orm";
import db from "@/lib/platform/db";

const { organizationArchival } = db.schema;

/** True when org has the separate Filecoin archival SKU active (not workspace SaaS). */
export async function isOrgArchivalActive(
	organizationId: string,
): Promise<boolean> {
	const [row] = await db
		.select({ status: organizationArchival.status })
		.from(organizationArchival)
		.where(
			and(
				eq(organizationArchival.organizationId, organizationId),
				eq(organizationArchival.status, "active"),
				gt(organizationArchival.retentionUntil, new Date()),
			),
		)
		.limit(1);

	return Boolean(row);
}
