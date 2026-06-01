import { runSyncAttachmentReleasesJob } from "@/lib/domains/attachments/utils/execute-attachment-release";
import { PLATFORM_ALERT_EVENTS } from "@/lib/platform/analytics/events";
import { emitCriticalPlatformEvent } from "@/lib/platform/analytics/platform-alerts";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

/** Daily — execute attachment releases when sign conditions are met. */
export const SYNC_ATTACHMENT_RELEASES_CRON = "15 0 * * *";

type CronHandle = { stop(): void };

export async function runSyncAttachmentReleasesCronTick(): Promise<void> {
	const res = await tryCatch(runSyncAttachmentReleasesJob());
	if (res.error) {
		logger.error({ err: res.error }, "cron sync-attachment-releases failed");
		void emitCriticalPlatformEvent({
			name: PLATFORM_ALERT_EVENTS.serverCronJobFailed,
			severity: "error",
			message: "Cron sync-attachment-releases failed",
			context: {
				job: "sync-attachment-releases",
				error:
					res.error instanceof Error ? res.error.message : String(res.error),
			},
		});
		return;
	}
	if (res.data.released > 0) {
		logger.info(res.data, "cron sync-attachment-releases");
	}
}

export function registerSyncAttachmentReleasesCron(): CronHandle {
	return Bun.cron(SYNC_ATTACHMENT_RELEASES_CRON, () =>
		runSyncAttachmentReleasesCronTick(),
	) as CronHandle;
}
