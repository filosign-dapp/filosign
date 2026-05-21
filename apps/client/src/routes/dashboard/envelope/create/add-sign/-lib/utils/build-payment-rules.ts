import type { PaymentRuleDraft } from "@filosign/react/files";
import {
	hashNormalizedSignerEmail,
	type PaymentReleaseType,
} from "@filosign/shared";
import { parseUnits } from "viem";
import { SUPPORTED_TOKENS } from "@/src/constants";
import type { PaymentAttachmentDraft } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types/payment-attachment";

export function buildPaymentRulesForSend(
	drafts: PaymentAttachmentDraft[],
): PaymentRuleDraft[] {
	const token = SUPPORTED_TOKENS[0];
	return drafts
		.filter((d) => d.amountUsdc.trim() && Number(d.amountUsdc) > 0)
		.map((d) => {
			const releaseType = d.releaseType satisfies PaymentReleaseType;
			const amount = parseUnits(d.amountUsdc.trim(), token.decimals);

			if (releaseType === "specific_signer" && d.specificSignerEmail) {
				return {
					recipientWallet: d.recipientWallet,
					recipientSource: d.recipientSource,
					amount,
					tokenAddress: token.address,
					releaseType: "specific_signer" as const,
					releaseParams: {
						releaseType: "specific_signer" as const,
						signerEmailCommitment: hashNormalizedSignerEmail(
							d.specificSignerEmail,
						),
					},
				};
			}

			return {
				recipientWallet: d.recipientWallet,
				recipientSource: d.recipientSource,
				amount,
				tokenAddress: token.address,
				releaseType: "all_signed" as const,
				releaseParams: { releaseType: "all_signed" as const },
			};
		});
}
