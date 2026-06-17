import type { UpgradePlanLimitReason } from "@filosign/react/billing";

export function resolveComposeAdvanceUpgrade(args: {
	recipientCount: number;
	settlementDraftCount: number;
	persistedAttachmentDraftCount: number;
	monthlyQuotaExhausted: boolean;
	withinRecipientLimit: boolean;
	settlementsAllowed: boolean;
	supplementaryAttachmentsAllowed: boolean;
	quorumN?: number;
	turnOrderEnabled?: boolean;
	advancedRoutingAllowed: boolean;
	payoutPayerSource?: "sender" | "org_wallet";
	workspaceTreasuryAllowed: boolean;
	treasuryPayerOffered: boolean;
}): UpgradePlanLimitReason | null {
	if (args.monthlyQuotaExhausted) {
		return "documents.sent.monthly";
	}

	if (!args.withinRecipientLimit) {
		return "envelope.recipients.max";
	}

	if ((args.quorumN ?? 0) > 0 && !args.advancedRoutingAllowed) {
		return "features.routing.advanced";
	}

	if (args.turnOrderEnabled && !args.advancedRoutingAllowed) {
		return "features.routing.advanced";
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

	if (
		args.payoutPayerSource === "org_wallet" &&
		!args.workspaceTreasuryAllowed
	) {
		return "features.treasury.workspace_custom";
	}

	if (
		args.payoutPayerSource === "org_wallet" &&
		args.workspaceTreasuryAllowed &&
		!args.treasuryPayerOffered
	) {
		return "features.treasury.workspace_custom";
	}

	return null;
}
