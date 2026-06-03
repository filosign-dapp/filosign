import { eq } from "drizzle-orm";
import { resolveFocRetentionUntil } from "@/lib/domains/foc/retention-policy";
import db from "@/lib/platform/db";
import {
	getOrCreatePlatformDataset,
	retentionEpochsFromUntil,
	synapse,
} from "@/lib/platform/foc";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const { focObjects, organizationArchival } = db.schema;

/**
 * Fund Synapse rails for the org's effective FOC horizon (max workspace + archival),
 * then mirror `retention_until` on all active FOC rows. Archival webhook triggers this;
 * does not re-upload bytes.
 */
export async function queueFocExtendRetention(organizationId: string) {
	const [archival] = await db
		.select({ retentionUntil: organizationArchival.retentionUntil })
		.from(organizationArchival)
		.where(eq(organizationArchival.organizationId, organizationId))
		.limit(1);

	if (!archival?.retentionUntil) {
		return;
	}

	const effectiveRetentionUntil =
		await resolveFocRetentionUntil(organizationId);
	const extraRunwayEpochs = retentionEpochsFromUntil(effectiveRetentionUntil);
	if (extraRunwayEpochs > 0n) {
		const context = await getOrCreatePlatformDataset();
		const prepared = await tryCatch(
			synapse.storage.prepare({
				context,
				dataSize: 0n,
				extraRunwayEpochs,
			}),
		);

		if (prepared.error) {
			throw new Error("Synapse prepare failed for archival retention extend", {
				cause: prepared.error,
			});
		}

		if (prepared.data.transaction) {
			const executed = await tryCatch(prepared.data.transaction.execute());
			if (executed.error) {
				throw new Error(
					"Synapse funding transaction failed for retention extend",
					{
						cause: executed.error,
					},
				);
			}

			logger.info(
				{
					organizationId,
					extraRunwayEpochs: extraRunwayEpochs.toString(),
					txHash: executed.data.hash,
				},
				"foc-extend-retention: Synapse prepare executed",
			);
		}
	}

	const updated = await db
		.update(focObjects)
		.set({
			retentionUntil: effectiveRetentionUntil,
			updatedAt: new Date(),
		})
		.where(eq(focObjects.organizationId, organizationId))
		.returning({ id: focObjects.id });

	logger.info(
		{ organizationId, focObjectCount: updated.length },
		"foc-extend-retention: updated foc_objects retention_until",
	);
}
