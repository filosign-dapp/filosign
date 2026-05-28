import { eq } from "drizzle-orm";
import type { Hex } from "viem";
import db from "@/lib/platform/db";
import { fsPaymentValidatorAt } from "@/lib/platform/evm";
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
	validatorAddress?: `0x${string}`,
): Promise<{ synced: boolean }> {
	const [row] = await db
		.select({ validatorAddress: fileSettlementRules.validatorAddress })
		.from(fileSettlementRules)
		.where(eq(fileSettlementRules.onChainRuleId, onChainRuleId))
		.limit(1);
	if (!row && !validatorAddress) return { synced: false };

	const validator = fsPaymentValidatorAt(
		validatorAddress ?? row?.validatorAddress ?? null,
	);

	const rulesRes = await tryCatch(validator.read.rules([onChainRuleId]));
	if (rulesRes.error) return { synced: false };

	if (!rulesRes.data[8]) return { synced: false };

	await markSettlementRuleExecuted(onChainRuleId, payoutTxHash);
	return { synced: true };
}
