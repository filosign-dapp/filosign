import { ORPCError } from "@orpc/server";
import { eq, sql } from "drizzle-orm";
import db from "@/lib/platform/db";

const { files } = db.schema;

/**
 * Future org-deletion safety guard.
 * We never allow deleting organizations that already contain signed files.
 */
export async function assertOrganizationDeletionAllowed(
	organizationId: string,
): Promise<void> {
	const [row] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(files)
		.where(eq(files.organizationId, organizationId));

	if ((row?.count ?? 0) > 0) {
		throw new ORPCError("FORBIDDEN", {
			message:
				"Organization contains legal file records; export/legal sign-off required before deletion",
		});
	}
}
