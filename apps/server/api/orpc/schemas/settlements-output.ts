import {
	settlementRecipientSources,
	settlementReleaseTypes,
	settlementRuleStatuses,
	zSettlementPayoutLegInput,
} from "@filosign/shared";
import z from "zod";

export const rpcSettlementsRegisterForFileOutputSchema = z.object({
	count: z.number().int().nonnegative(),
});

export const rpcSettlementsUpdateRuleOutputSchema = z.object({
	ok: z.literal(true),
	onChainRuleId: z.string(),
});

export const rpcSettlementsCancelRuleOutputSchema = z.object({
	ok: z.literal(true),
	onChainRuleId: z.string(),
});

export const rpcSettlementsConfirmSettlementOutputSchema = z.object({
	ok: z.literal(true),
	onChainRuleId: z.string(),
	payoutTxHash: z.string(),
});

export const rpcSettlementsTrySettleOutputSchema = z.object({
	ok: z.literal(true),
	onChainRuleId: z.string(),
	payoutTxHash: z.string().nullable(),
	status: z.literal("executed"),
});

export const rpcSettlementsListByFileOutputSchema = z.array(
	z.object({
		id: z.uuid(),
		onChainRuleId: z.string(),
		legs: z.array(zSettlementPayoutLegInput),
		recipientWallet: z.string(),
		recipientSource: z.enum(settlementRecipientSources),
		amount: z.string(),
		totalAmount: z.string(),
		tokenAddress: z.string(),
		releaseType: z.enum(settlementReleaseTypes),
		releaseParams: z.record(z.string(), z.unknown()),
		expiresAt: z.string().nullable(),
		status: z.enum(settlementRuleStatuses),
		payoutTxHash: z.string().nullable(),
		updateRuleTxHash: z.string().nullable(),
		cancelRuleTxHash: z.string().nullable(),
		lastError: z.string().nullable(),
		executedAt: z.string().nullable(),
		canExecuteOnChain: z.boolean().nullable(),
	}),
);
