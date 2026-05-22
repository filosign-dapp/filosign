import type { SettlementRuleDraft } from "@filosign/react/files";
import {
	hashNormalizedSignerEmail,
	type SettlementReleaseType,
} from "@filosign/shared";
import { parseUnits } from "viem";
import { SUPPORTED_TOKENS } from "@/src/constants";
import type { SettlementAttachmentDraft } from "@/src/routes/dashboard/envelope/create/-lib/types/settlement-attachment";

function draftWithRecipientWallet(
	d: SettlementAttachmentDraft,
): d is SettlementAttachmentDraft & { recipientWallet: `0x${string}` } {
	return Boolean(d.recipientWallet);
}

export function buildSettlementRulesForSend(
	drafts: SettlementAttachmentDraft[],
): SettlementRuleDraft[] {
	const token = SUPPORTED_TOKENS[0];
	const rules: SettlementRuleDraft[] = [];

	for (const d of drafts) {
		if (!d.amountUsdc.trim() || Number(d.amountUsdc) <= 0) continue;
		if (!draftWithRecipientWallet(d)) continue;

		const releaseType = d.releaseType satisfies SettlementReleaseType;
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
