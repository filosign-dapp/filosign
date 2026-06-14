import type { EntitlementsSnapshot } from "@filosign/react/billing";
import {
	canSelectSupplementaryRecipients,
	canUseBasicSettlements,
	canUseConditionalAttachmentRelease,
	canUseSupplementaryAttachments,
} from "@filosign/react/files";
import { validateAttachmentPacketDraftsForSend } from "@filosign/shared";
import { TOASTS } from "@/src/lib/copy/toasts";
import { planLimitToastFailure } from "@/src/lib/domains/entitlements/plan-limit-toast";
import type { AttachmentPacketComposeDraft } from "@/src/lib/domains/files/attachment-packet-compose";
import { validateAttachmentPacketComposeDrafts } from "@/src/lib/domains/files/validate-attachment-packets";
import type { SettlementAttachmentDraft } from "@/src/lib/domains/settlements/attachment-draft";
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
