import type { PaymentRuleDraft } from "@filosign/react/files";
import {
	hashNormalizedSignerEmail,
	type PaymentReleaseType,
} from "@filosign/shared";
import { parseUnits } from "viem";
import { SUPPORTED_TOKENS } from "@/src/constants";
import type { PaymentAttachmentDraft } from "@/src/routes/dashboard/envelope/create/-lib/types/payment-attachment";

function draftWithRecipientWallet(
	d: PaymentAttachmentDraft,
): d is PaymentAttachmentDraft & { recipientWallet: `0x${string}` } {
	return Boolean(d.recipientWallet);
}

export function buildPaymentRulesForSend(
	drafts: PaymentAttachmentDraft[],
): PaymentRuleDraft[] {
	const token = SUPPORTED_TOKENS[0];
	const rules: PaymentRuleDraft[] = [];

	for (const d of drafts) {
		if (!d.amountUsdc.trim() || Number(d.amountUsdc) <= 0) continue;
		if (!draftWithRecipientWallet(d)) continue;

		const releaseType = d.releaseType satisfies PaymentReleaseType;
		const amount = parseUnits(d.amountUsdc.trim(), token.decimals);
		const recipientWallet = d.recipientWallet;

		if (releaseType === "specific_signer" && d.specificSignerEmail) {
			rules.push({
				recipientWallet,
				recipientSource: d.recipientSource,
				amount,
				tokenAddress: token.address,
				releaseType: "specific_signer",
				releaseParams: {
					releaseType: "specific_signer",
					signerEmailCommitment: hashNormalizedSignerEmail(
						d.specificSignerEmail,
					),
				},
			});
			continue;
		}

		rules.push({
			recipientWallet,
			recipientSource: d.recipientSource,
			amount,
			tokenAddress: token.address,
			releaseType: "all_signed",
			releaseParams: { releaseType: "all_signed" },
		});
	}

	return rules;
}
