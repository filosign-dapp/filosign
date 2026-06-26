import { syncOrgControllersOnChain } from "@/lib/domains/orgs/controllers";
import { enqueueOrgControllerSync } from "@/lib/platform/jobs/queues";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

/**
 * Best-effort controller sync after membership changes.
 * Never throws: failures are logged and retried via BullMQ.
 */
export async function syncOrgControllersAfterMembershipChange(
	organizationId: string,
): Promise<void> {
	const syncRes = await tryCatch(syncOrgControllersOnChain(organizationId));
	if (!syncRes.error) return;

	logger.error(
		{ err: syncRes.error, organizationId },
		"org controller sync failed; enqueueing retry",
	);
	await enqueueOrgControllerSync(organizationId);
}
