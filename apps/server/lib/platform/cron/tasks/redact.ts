import { and, isNotNull, lt, or } from "drizzle-orm";
import {
	emitCriticalPlatformEvent,
	PLATFORM_ALERT_EVENTS,
} from "@/lib/platform/analytics";
import db from "@/lib/platform/db";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { CRON_LOCK_TTL, type CronHandle, registerLockedCron } from "../utils";

// ==========================================
// 1. Redact Access Request PII
// ==========================================

export const REDACT_ACCESS_REQUEST_PII_CRON = "20 2 * * *";
export const ACCESS_REQUEST_PII_RETENTION_DAYS = 180;

function accessRequestCutoff(): Date {
	return new Date(
		Date.now() - ACCESS_REQUEST_PII_RETENTION_DAYS * 24 * 60 * 60 * 1000,
	);
}

export async function runRedactAccessRequestPiiJob(): Promise<{
	redacted: number;
}> {
	const { accessRequests } = db.schema;
	const cutoff = accessRequestCutoff();
	const rows = await db
		.update(accessRequests)
		.set({
			email: "redacted@privacy.filosign.local",
			name: null,
			company: null,
			message: null,
			updatedAt: new Date(),
		})
		.where(
			and(
				lt(accessRequests.createdAt, cutoff),
				or(
					isNotNull(accessRequests.name),
					isNotNull(accessRequests.company),
					isNotNull(accessRequests.message),
				),
			),
		)
		.returning({ id: accessRequests.id });
	return { redacted: rows.length };
}

export async function runRedactAccessRequestPiiCronTick(): Promise<void> {
	const res = await tryCatch(runRedactAccessRequestPiiJob());
	if (res.error) {
		logger.error({ err: res.error }, "cron redact-access-request-pii failed");
		void emitCriticalPlatformEvent({
			name: PLATFORM_ALERT_EVENTS.serverCronJobFailed,
			severity: "error",
			message: "Cron redact-access-request-pii failed",
			context: {
				job: "redact-access-request-pii",
				error:
					res.error instanceof Error ? res.error.message : String(res.error),
			},
		});
		return;
	}
	if (res.data.redacted > 0) {
		logger.info(res.data, "cron redact-access-request-pii");
	}
}

export function registerRedactAccessRequestPiiCron(): CronHandle {
	return registerLockedCron({
		jobName: "redact-access-request-pii",
		schedule: REDACT_ACCESS_REQUEST_PII_CRON,
		bucketGranularity: "day",
		lockTtlSec: CRON_LOCK_TTL.daily,
		tick: runRedactAccessRequestPiiCronTick,
	});
}

// ==========================================
// 2. Redact Compliance Metadata
// ==========================================

export const REDACT_COMPLIANCE_METADATA_CRON = "0 2 * * *";
export const COMPLIANCE_METADATA_RETENTION_DAYS = 365;

function complianceRetentionCutoff(): Date {
	return new Date(
		Date.now() - COMPLIANCE_METADATA_RETENTION_DAYS * 24 * 60 * 60 * 1000,
	);
}

export async function runRedactComplianceMetadataJob(): Promise<{
	redacted: number;
}> {
	const { complianceExportLogs, fileSignatures } = db.schema;
	const cutoff = complianceRetentionCutoff();
	const exportRows = await db
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

	const signatureRows = await db
		.update(fileSignatures)
		.set({
			requestIp: null,
			requestUserAgent: null,
		})
		.where(
			and(
				lt(fileSignatures.createdAt, cutoff),
				or(
					isNotNull(fileSignatures.requestIp),
					isNotNull(fileSignatures.requestUserAgent),
				),
			),
		)
		.returning({
			filePieceCid: fileSignatures.filePieceCid,
			signer: fileSignatures.signer,
		});

	return { redacted: exportRows.length + signatureRows.length };
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
