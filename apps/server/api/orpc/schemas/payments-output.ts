import { paymentRecipientSources, paymentRuleStatuses } from "@filosign/shared";
import z from "zod";

export const rpcPaymentsRequestRetryOutputSchema = z.object({
	ok: z.literal(true),
	onChainRuleId: z.string(),
});

export const rpcPaymentsListByFileOutputSchema = z.array(
	z.object({
		id: z.uuid(),
		onChainRuleId: z.string(),
		recipientWallet: z.string(),
		recipientSource: z.enum(paymentRecipientSources),
		amount: z.string(),
		tokenAddress: z.string(),
		releaseType: z.string(),
		status: z.enum(paymentRuleStatuses),
		payoutTxHash: z.string().nullable(),
		lastError: z.string().nullable(),
		executedAt: z.string().nullable(),
	}),
);
