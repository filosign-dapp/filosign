import type { UpgradePlanLimitReason } from "@filosign/react/billing";

export function resolveComposeAdvanceUpgrade(args: {
	recipientCount: number;
	settlementDraftCount: number;
	persistedAttachmentDraftCount: number;
	monthlyQuotaExhausted: boolean;
	withinRecipientLimit: boolean;
	settlementsAllowed: boolean;
	supplementaryAttachmentsAllowed: boolean;
}): UpgradePlanLimitReason | null {
	if (args.monthlyQuotaExhausted) {
		return "documents.sent.monthly";
	}

	if (!args.withinRecipientLimit) {
		return "envelope.recipients.max";
	}

	if (args.settlementDraftCount > 0 && !args.settlementsAllowed) {
		return "features.settlement.basic";
	}

	if (
		args.persistedAttachmentDraftCount > 0 &&
		!args.supplementaryAttachmentsAllowed
	) {
		return "features.supplementary_attachments";
	}

	return null;
}
