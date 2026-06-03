import { and, eq, lt } from "drizzle-orm";
import db from "@/lib/platform/db";
import { logger } from "@/lib/platform/pino";

const { focObjects, organizationArchival } = db.schema;

/** Mark FOC objects pending deletion after export grace elapsed. */
export async function purgeLapsedOrgArchival(): Promise<number> {
	const now = new Date();
	const lapsed = await db
		.select({ organizationId: organizationArchival.organizationId })
		.from(organizationArchival)
		.where(
			and(
				eq(organizationArchival.status, "lapsed"),
				lt(organizationArchival.exportGraceUntil, now),
			),
		);

	let purgedOrgs = 0;
	for (const row of lapsed) {
		const updated = await db
			.update(focObjects)
			.set({ lifecycle: "pending_deletion", updatedAt: now })
			.where(
				and(
					eq(focObjects.organizationId, row.organizationId),
					eq(focObjects.lifecycle, "active"),
				),
			)
			.returning({ id: focObjects.id });

		await db
			.update(organizationArchival)
			.set({ status: "none", updatedAt: now })
			.where(eq(organizationArchival.organizationId, row.organizationId));

		if (updated.length > 0) {
			logger.info(
				{
					organizationId: row.organizationId,
					focObjectCount: updated.length,
				},
				"purge-lapsed-archival: marked foc_objects pending_deletion",
			);
		}
		purgedOrgs += 1;
	}

	return purgedOrgs;
}
