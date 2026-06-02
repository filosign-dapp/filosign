import { and, isNotNull, lt, or } from "drizzle-orm";
import { PLATFORM_ALERT_EVENTS } from "@/lib/platform/analytics/events";
import { emitCriticalPlatformEvent } from "@/lib/platform/analytics/platform-alerts";
import db from "@/lib/platform/db";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import {
	CRON_LOCK_TTL,
	type CronHandle,
	registerLockedCron,
} from "./register-locked-cron";

/** Daily at 02:00 UTC — redact old request metadata from compliance export logs. */
export const REDACT_COMPLIANCE_METADATA_CRON = "0 2 * * *";
export const COMPLIANCE_METADATA_RETENTION_DAYS = 365;

const { complianceExportLogs } = db.schema;

function retentionCutoff(): Date {
	return new Date(
		Date.now() - COMPLIANCE_METADATA_RETENTION_DAYS * 24 * 60 * 60 * 1000,
	);
}

export async function runRedactComplianceMetadataJob(): Promise<{
	redacted: number;
}> {
	const cutoff = retentionCutoff();
	const rows = await db
		.update(complianceExportLogs)
		.set({
			requestIp: null,
			requestUserAgent: null,
		})
		.where(
			and(
				lt(complianceExportLogs.createdAt, cutoff),
				or(
					isNotNull(complianceExportLogs.requestIp),
					isNotNull(complianceExportLogs.requestUserAgent),
				),
			),
		)
		.returning({ id: complianceExportLogs.id });
	return { redacted: rows.length };
}

export async function runRedactComplianceMetadataCronTick(): Promise<void> {
	const res = await tryCatch(runRedactComplianceMetadataJob());
	if (res.error) {
		logger.error({ err: res.error }, "cron redact-compliance-metadata failed");
		void emitCriticalPlatformEvent({
			name: PLATFORM_ALERT_EVENTS.serverCronJobFailed,
			severity: "error",
			message: "Cron redact-compliance-metadata failed",
			context: {
				job: "redact-compliance-metadata",
				error:
					res.error instanceof Error ? res.error.message : String(res.error),
			},
		});
		return;
	}
	if (res.data.redacted > 0) {
		logger.info(res.data, "cron redact-compliance-metadata");
	}
}

export function registerRedactComplianceMetadataCron(): CronHandle {
	return registerLockedCron({
		jobName: "redact-compliance-metadata",
		schedule: REDACT_COMPLIANCE_METADATA_CRON,
		bucketGranularity: "day",
		lockTtlSec: CRON_LOCK_TTL.daily,
		tick: runRedactComplianceMetadataCronTick,
	});
}
