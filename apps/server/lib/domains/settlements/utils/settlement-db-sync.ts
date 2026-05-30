import type { SettlementRuleRegistrationInput } from "@filosign/shared";
import { eq } from "drizzle-orm";
import db from "@/lib/platform/db";

const { fileSettlementRules } = db.schema;

export async function markSettlementRuleCancelled(
	onChainRuleId: bigint,
	cancelRuleTxHash: `0x${string}`,
) {
	await db
		.update(fileSettlementRules)
		.set({
			status: "cancelled",
			cancelRuleTxHash,
			lastError: null,
			updatedAt: new Date(),
		})
		.where(eq(fileSettlementRules.onChainRuleId, onChainRuleId));
}

export async function markSettlementRuleUpdated(args: {
	onChainRuleId: bigint;
	updateRuleTxHash: `0x${string}`;
	legs: SettlementRuleRegistrationInput["legs"];
	releaseType: SettlementRuleRegistrationInput["releaseType"];
	releaseParams: SettlementRuleRegistrationInput["releaseParams"];
	expiresAt?: string;
}) {
	if (!args.legs[0]) {
		throw new Error("Settlement rule requires at least one payout leg");
	}
	await db
		.update(fileSettlementRules)
		.set({
			legs: args.legs,
			releaseType: args.releaseType,
			releaseParams: args.releaseParams,
			expiresAt: args.expiresAt ?? null,
			updateRuleTxHash: args.updateRuleTxHash,
			lastError: null,
			updatedAt: new Date(),
		})
		.where(eq(fileSettlementRules.onChainRuleId, args.onChainRuleId));
}
