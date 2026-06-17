import type {
	SettlementPayoutLegStored,
	SettlementRuleStatus,
} from "@filosign/shared";
import type { Address, Hex } from "viem";
import db from "@/lib/platform/db";
import { fsPaymentValidatorAt } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { selectSettlementRule, settlementRuleWhere } from "./rule-lookup";
import { settlementSchema } from "./schema";
import {
	mergeSettlementLegsWithPaidFlags,
	readSettlementLegPaidFlags,
	settlementPaidLegCount,
} from "./sync-legs-from-chain";

function deriveStatusFromPaidFlags(
	paidCount: number,
	legCount: number,
	fullyExecutedOnChain: boolean,
): SettlementRuleStatus | null {
	if (legCount === 0) return null;
	if (fullyExecutedOnChain || paidCount === legCount) return "executed";
	if (paidCount > 0) return "partial";
	return null;
}

export async function syncSettlementPayoutFromChain(
	onChainRuleId: bigint,
	validatorAddress: Address,
	payoutTxHash?: Hex,
	legIndex?: number,
): Promise<{
	synced: boolean;
	status?: "executed" | "partial" | "cancelled";
}> {
	const row = await selectSettlementRule(onChainRuleId, validatorAddress);
	if (!row) return { synced: false };

	const validator = fsPaymentValidatorAt(validatorAddress);
	const rulesRes = await tryCatch(validator.read.rules([onChainRuleId]));
	if (rulesRes.error) return { synced: false };

	const fullyExecuted = rulesRes.data[7];
	const cancelled = rulesRes.data[8];
	const legCount = row.legs.length;

	const paidFlags = await readSettlementLegPaidFlags({
		validator,
		onChainRuleId,
		legCount,
	});
	if (!paidFlags) return { synced: false };

	const mergedLegs = mergeSettlementLegsWithPaidFlags(
		row.legs as SettlementPayoutLegStored[],
		paidFlags,
	);
	if (legIndex !== undefined && payoutTxHash && mergedLegs[legIndex]) {
		mergedLegs[legIndex] = {
			...mergedLegs[legIndex],
			paid: true,
			payoutTxHash,
		};
	}

	const paidCount = settlementPaidLegCount(paidFlags);
	const derived = deriveStatusFromPaidFlags(paidCount, legCount, fullyExecuted);

	const status: SettlementRuleStatus = cancelled
		? "cancelled"
		: (derived ?? (fullyExecuted ? "executed" : row.status));

	if (status === row.status && legIndex === undefined && !fullyExecuted) {
		return { synced: false };
	}

	const isTerminal = status === "executed" || status === "cancelled";
	const { fileSettlementRules } = settlementSchema();
	await db
		.update(fileSettlementRules)
		.set({
			status,
			legs: mergedLegs,
			...(payoutTxHash ? { payoutTxHash } : {}),
			...(isTerminal
				? { executedAt: new Date(), lastError: null }
				: { lastError: null }),
			updatedAt: new Date(),
		})
		.where(
			settlementRuleWhere({
				validatorAddress,
				onChainRuleId,
			}),
		);

	return {
		synced: true,
		status:
			status === "executed"
				? "executed"
				: status === "partial"
					? "partial"
					: status === "cancelled"
						? "cancelled"
						: undefined,
	};
}
