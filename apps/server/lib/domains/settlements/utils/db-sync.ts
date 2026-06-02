import type { SettlementRuleRegistrationInput } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import type { Address } from "viem";
import db from "@/lib/platform/db";
import { settlementRuleWhere } from "./rule-lookup";

const { fileSettlementRules } = db.schema;

export async function markSettlementRuleCancelled(args: {
	onChainRuleId: bigint;
	validatorAddress: Address;
	cancelRuleTxHash: `0x${string}`;
}) {
	await db
		.update(fileSettlementRules)
		.set({
			status: "cancelled",
			cancelRuleTxHash: args.cancelRuleTxHash,
			lastError: null,
			updatedAt: new Date(),
		})
		.where(
			settlementRuleWhere({
				validatorAddress: args.validatorAddress,
				onChainRuleId: args.onChainRuleId,
			}),
		);
}

export async function markSettlementRuleUpdated(args: {
	onChainRuleId: bigint;
	validatorAddress: Address;
	updateRuleTxHash: `0x${string}`;
	legs: SettlementRuleRegistrationInput["legs"];
	releaseType: SettlementRuleRegistrationInput["releaseType"];
	releaseParams: SettlementRuleRegistrationInput["releaseParams"];
	expiresAt?: string;
}) {
	if (!args.legs[0]) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Settlement rule requires at least one payout leg",
		});
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
		.where(
			settlementRuleWhere({
				validatorAddress: args.validatorAddress,
				onChainRuleId: args.onChainRuleId,
			}),
		);
}
