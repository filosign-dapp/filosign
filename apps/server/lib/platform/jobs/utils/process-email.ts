import { eq } from "drizzle-orm";
import db from "@/lib/platform/db";
import type { JobOutboxKind } from "@/lib/platform/db/schema/job-outbox";
import { jobOutbox as jobOutboxTable } from "@/lib/platform/db/schema/job-outbox";
import {
	sendColdDocumentInviteEmail,
	sendDocumentReceivedEmail,
} from "@/lib/platform/email/invites";
import { logger } from "@/lib/platform/pino";
import type { EmailQueueJobData } from "../queues";
import {
	type ColdDocInviteOutboxPayload,
	type DocReceivedOutboxPayload,
	markOutboxFailed,
	markOutboxProcessed,
	parseOutboxPayload,
} from "./outbox";

export async function processEmailFromOutbox(
	kind: JobOutboxKind,
	payload: Record<string, unknown>,
): Promise<void> {
	if (kind === "doc_received") {
		const parsed = parseOutboxPayload(
			kind,
			payload,
		) as DocReceivedOutboxPayload;
		await sendDocumentReceivedEmail({
			to: parsed.to,
			senderWallet: parsed.senderWallet,
			pieceCid: parsed.pieceCid,
			senderName: parsed.senderName,
		});
		return;
	}

	const parsed = parseOutboxPayload(
		"cold_doc_invite",
		payload,
	) as ColdDocInviteOutboxPayload;
	await sendColdDocumentInviteEmail({
		to: parsed.to,
		senderWallet: parsed.senderWallet,
		pieceCid: parsed.pieceCid,
		inviteToken: parsed.inviteToken,
		senderName: parsed.senderName,
	});
}

/** BullMQ handler: load outbox row, deliver, mark processed only after success. */
export async function processEmailOutboxJob(
	data: EmailQueueJobData,
): Promise<void> {
	const { outboxId, kind } = data;

	const [row] = await db
		.select()
		.from(jobOutboxTable)
		.where(eq(jobOutboxTable.id, outboxId))
		.limit(1);

	if (!row) {
		logger.warn({ outboxId }, "email job missing outbox row");
		return;
	}
	if (row.processedAt) return;

	try {
		await processEmailFromOutbox(kind, row.payload);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		await markOutboxFailed(outboxId, message);
		throw err;
	}
	await markOutboxProcessed(outboxId);
}
