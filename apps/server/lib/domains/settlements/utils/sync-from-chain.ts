import { eq } from "drizzle-orm";
import type { Hex } from "viem";
import db from "@/lib/platform/db";
import { fsContracts } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const { fileSettlementRules } = db.schema;

async function markSettlementRuleExecuted(
	onChainRuleId: bigint,
	payoutTxHash?: Hex,
) {
	await db
		.update(fileSettlementRules)
		.set({
			status: "executed",
			...(payoutTxHash ? { payoutTxHash } : {}),
			executedAt: new Date(),
			lastError: null,
			updatedAt: new Date(),
		})
		.where(eq(fileSettlementRules.onChainRuleId, onChainRuleId));
}

export async function syncSettlementPayoutFromChain(
	onChainRuleId: bigint,
	payoutTxHash?: Hex,
): Promise<{ synced: boolean }> {
	const validator = fsContracts.FSPaymentValidator;
	if (!validator) return { synced: false };

	const rulesRes = await tryCatch(validator.read.rules([onChainRuleId]));
	if (rulesRes.error) return { synced: false };

	if (!rulesRes.data[8]) return { synced: false };

	await markSettlementRuleExecuted(onChainRuleId, payoutTxHash);
	return { synced: true };
}
