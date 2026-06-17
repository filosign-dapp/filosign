import type { EntitlementsSnapshot } from "@filosign/react/billing";
import {
	canSelectSupplementaryRecipients,
	canUseBasicSettlements,
	canUseConditionalAttachmentRelease,
	canUseSupplementaryAttachments,
	canUseWorkspaceTreasury,
	type SendFileArgs,
} from "@filosign/react/files";
import { validateAttachmentPacketDraftsForSend } from "@filosign/shared";
import type { Address } from "viem";
import { getAddress, isAddress } from "viem";
import { TOASTS } from "@/src/lib/copy/toasts";
import { planLimitToastFailure } from "@/src/lib/domains/entitlements/plan-limit-toast";
import type { AttachmentPacketComposeDraft } from "@/src/lib/domains/files/attachment-packet-compose";
import { validateAttachmentPacketComposeDrafts } from "@/src/lib/domains/files/validate-attachment-packets";
import type { SettlementAttachmentDraft } from "@/src/lib/domains/settlements";
import type { EnvelopeSendValidationFailure } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/validation-types";

export function validateSettlementDraftsForSend(args: {
	entitlements: EntitlementsSnapshot | undefined;
	settlementDrafts: SettlementAttachmentDraft[] | undefined;
}): EnvelopeSendValidationFailure | null {
	if ((args.settlementDrafts?.length ?? 0) === 0) return null;
	if (canUseBasicSettlements(args.entitlements)) return null;

	return planLimitToastFailure("features.settlement.basic");
}

export function validateAttachmentPacketsForSend(args: {
	entitlements: EntitlementsSnapshot | undefined;
	attachmentComposeDrafts: AttachmentPacketComposeDraft[];
	rosterEmails: string[];
}): EnvelopeSendValidationFailure | null {
	if (args.attachmentComposeDrafts.length === 0) return null;

	if (!canUseSupplementaryAttachments(args.entitlements)) {
		return planLimitToastFailure("features.supplementary_attachments");
	}

	const attachmentIssues = [
		...validateAttachmentPacketDraftsForSend({
			supplementaryAttachments: canUseSupplementaryAttachments(
				args.entitlements,
			),
			recipientSelect: canSelectSupplementaryRecipients(args.entitlements),
			conditionalRelease: canUseConditionalAttachmentRelease(args.entitlements),
			drafts: args.attachmentComposeDrafts,
			rosterEmails: args.rosterEmails,
		}),
		...validateAttachmentPacketComposeDrafts({
			drafts: args.attachmentComposeDrafts,
		}),
	];
	if (attachmentIssues.length > 0) {
		return {
			kind: "toast",
			title: "Check attached files",
			hint: TOASTS.send.invalidSupplementaryFiles,
		};
	}

	return null;
}

export function validateTreasuryPayerForSend(args: {
	payoutPayerSource?: "sender" | "org_wallet";
	orgWalletAddress?: string | null;
	connectedWalletAddress?: Address;
	registerSettlementRules?: SendFileArgs["registerSettlementRules"];
	hasSettlementDrafts: boolean;
	entitlements?: EntitlementsSnapshot;
}): EnvelopeSendValidationFailure | null {
	if (!args.hasSettlementDrafts || args.payoutPayerSource !== "org_wallet") {
		return null;
	}
	if (!canUseWorkspaceTreasury(args.entitlements)) {
		return {
			kind: "toast",
			title: "Workspace treasury needs Teams Pro",
			hint: "Upgrade to Teams Pro or switch payout payer to your connected wallet.",
		};
	}

	if (!args.orgWalletAddress || !isAddress(args.orgWalletAddress)) {
		return {
			kind: "toast",
			title: "Workspace treasury is not linked",
			hint: "Link a treasury wallet in workspace settings or switch payout payer to your connected wallet.",
		};
	}

	const treasuryAddress = getAddress(args.orgWalletAddress);
	if (
		args.connectedWalletAddress &&
		getAddress(args.connectedWalletAddress).toLowerCase() ===
			treasuryAddress.toLowerCase()
	) {
		return {
			kind: "toast",
			title: "Treasury matches your signing wallet",
			hint: 'Switch payout payer to "My connected wallet" when treasury and signing wallet are the same address.',
		};
	}

	if (!args.registerSettlementRules) {
		return {
			kind: "toast",
			title: "Treasury payout setup is not ready",
			hint: "Refresh the page and try again. Treasury payouts require a separate wallet connect on send.",
		};
	}

	return null;
}
