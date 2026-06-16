import {
	canSettlementReleaseBeforeEnvelopeComplete,
	type SettlementReleaseType,
} from "@filosign/shared";
import { eq } from "drizzle-orm";
import db from "@/lib/platform/db";
import {
	readPieceEnvelopeProgress,
	waitingForMoreSigners,
} from "../envelope-signing-progress";

const { fileSettlementRules } = db.schema;

/** Skip per-sign payout enqueue when envelope is incomplete and every rule needs full completion. */
export async function shouldEnqueuePayoutOnSign(
	pieceCid: string,
): Promise<boolean> {
	const progress = await readPieceEnvelopeProgress(pieceCid);
	if (!waitingForMoreSigners(progress)) {
		return true;
	}

	const rules = await db
		.select({ releaseType: fileSettlementRules.releaseType })
		.from(fileSettlementRules)
		.where(eq(fileSettlementRules.pieceCid, pieceCid));

	if (rules.length === 0) {
		return false;
	}

	return rules.some((row) =>
		canSettlementReleaseBeforeEnvelopeComplete(
			row.releaseType as SettlementReleaseType,
		),
	);
}
