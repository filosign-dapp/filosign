import {
	settlementRecipientSources,
	settlementRuleStatuses,
} from "@filosign/shared";
import z from "zod";

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
		recipientWallet: z.string(),
		recipientSource: z.enum(settlementRecipientSources),
		amount: z.string(),
		tokenAddress: z.string(),
		releaseType: z.string(),
		status: z.enum(settlementRuleStatuses),
		payoutTxHash: z.string().nullable(),
		lastError: z.string().nullable(),
		executedAt: z.string().nullable(),
	}),
);
