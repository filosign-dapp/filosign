import type { JobOutboxKind } from "@/lib/platform/db/schema/job-outbox";
import {
	sendColdDocumentInviteEmail,
	sendDocumentReceivedEmail,
} from "@/lib/platform/email/invites";
import {
	type ColdDocInviteOutboxPayload,
	type DocReceivedOutboxPayload,
	parseOutboxPayload,
} from "./outbox-payload";

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
