import { eq } from "drizzle-orm";
import { getAddress } from "viem";
import db from "@/lib/platform/db";
import { fsContracts } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { payerCanFundPayout } from "./payout-preflight";

const { filePaymentRules } = db.schema;

/** Only `pending` is auto-promoted; failed_* require sender retry via oRPC. */
const AUTO_READY_STATUS = "pending" as const;

export async function runSyncPaymentRulesJob(): Promise<{
	scanned: number;
	markedReady: number;
}> {
	const validator = fsContracts.FSPaymentValidator;
	if (!validator) {
		return { scanned: 0, markedReady: 0 };
	}

	const validatorAddress = getAddress(validator.address);

	const rows = await db
		.select({
			id: filePaymentRules.id,
			onChainRuleId: filePaymentRules.onChainRuleId,
			payerWallet: filePaymentRules.payerWallet,
			tokenAddress: filePaymentRules.tokenAddress,
			amount: filePaymentRules.amount,
		})
		.from(filePaymentRules)
		.where(eq(filePaymentRules.status, AUTO_READY_STATUS));

	let markedReady = 0;
	for (const row of rows) {
		const canRes = await tryCatch(
			validator.read.canExecute([row.onChainRuleId]),
		);
		if (canRes.error || !canRes.data) continue;

		const fundedRes = await tryCatch(
			payerCanFundPayout({
				onChainRuleId: row.onChainRuleId,
				payer: getAddress(row.payerWallet),
				token: getAddress(row.tokenAddress),
				amount: BigInt(row.amount),
				validator: validatorAddress,
			}),
		);
		if (fundedRes.error || !fundedRes.data) continue;

		const updateRes = await tryCatch(
			db
				.update(filePaymentRules)
				.set({ status: "ready", updatedAt: new Date() })
				.where(eq(filePaymentRules.id, row.id)),
		);
		if (updateRes.error) throw updateRes.error;
		markedReady++;
	}

	return { scanned: rows.length, markedReady };
}
