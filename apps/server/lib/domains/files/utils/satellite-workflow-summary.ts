import type { SatelliteWorkflowSummary } from "@filosign/shared";
import {
	mapConditionalPacketsForWorkflowSummary,
	summarizeSatelliteWorkflows,
} from "@filosign/shared";
import { eq } from "drizzle-orm";
import { listConditionalAttachmentPacketsForSender } from "@/lib/domains/files/utils/piece-helpers";
import db from "@/lib/platform/db";

const { fileSettlementRules } = db.schema;

export async function loadSatelliteWorkflowSummaryForPiece(
	pieceCid: string,
): Promise<SatelliteWorkflowSummary> {
	const settlementRows = await db
		.select({ status: fileSettlementRules.status })
		.from(fileSettlementRules)
		.where(eq(fileSettlementRules.pieceCid, pieceCid));

	const conditionalAttachments =
		await listConditionalAttachmentPacketsForSender(pieceCid);

	return summarizeSatelliteWorkflows({
		settlements: settlementRows,
		attachments: mapConditionalPacketsForWorkflowSummary(
			conditionalAttachments,
		),
	});
}
