import { eq, inArray } from "drizzle-orm";
import db from "@/lib/platform/db";
import { fsContracts } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const { filePaymentRules } = db.schema;

const SYNC_STATUSES = [
	"pending",
	"ready",
	"failed_insufficient",
	"failed_gas_tank",
	"failed_conditions",
] as const;

export async function runSyncPaymentRulesJob(): Promise<{
	scanned: number;
	markedReady: number;
}> {
	const validator = fsContracts.FSPaymentValidator;
	if (!validator) {
		return { scanned: 0, markedReady: 0 };
	}

	const rows = await db
		.select({
			id: filePaymentRules.id,
			onChainRuleId: filePaymentRules.onChainRuleId,
			status: filePaymentRules.status,
		})
		.from(filePaymentRules)
		.where(inArray(filePaymentRules.status, [...SYNC_STATUSES]));

	let markedReady = 0;
	for (const row of rows) {
		const canRes = await tryCatch(
			validator.read.canExecute([row.onChainRuleId]),
		);
		if (canRes.error || !canRes.data) continue;

		if (row.status !== "ready") {
			const updateRes = await tryCatch(
				db
					.update(filePaymentRules)
					.set({ status: "ready", updatedAt: new Date() })
					.where(eq(filePaymentRules.id, row.id)),
			);
			if (updateRes.error) throw updateRes.error;
			markedReady++;
		}
	}

	return { scanned: rows.length, markedReady };
}
