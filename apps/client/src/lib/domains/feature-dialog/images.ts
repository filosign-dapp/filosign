import type { UpgradePlanLimitReason } from "@filosign/react/billing";

export const FEATURE_DIALOG_IMAGES = {
	billingChangePreviewDialog: "/images/ww/stock_47.webp",
	signSuccessProofPacketDialog: "/images/ww/stock_46.webp",
	recoveryPhraseAndCryptoUnlockDialog: "/images/ww/stock_63.webp",
	workspaceCreateInviteTrialDialog: "/images/ww/stock_44.webp",
	signInOtpAndInviteUnlockDialog: "/images/ww/stock_26.webp",
	upgradePlanDialogTeamsProRouting: "/images/ww/stock_18.webp",
	upgradePlanDialogDocumentSendLimit: "/images/ww/stock_18.webp",
	upgradePlanDialogRecipientLimit: "/images/ww/stock_18.webp",
	upgradePlanDialogSettlementLimit: "/images/ww/stock_18.webp",
	upgradePlanDialogSharedTemplatesLimit: "/images/ww/stock_18.webp",
	upgradePlanDialogSupplementaryAttachmentsLimit: "/images/ww/stock_18.webp",
	postSendEnvelopeSentDialog: "/images/ww/stock_24.webp",
	coldShareAccessDialog: "/images/ww/stock_24.webp",
} as const;

export type FeatureDialogImageKey = keyof typeof FEATURE_DIALOG_IMAGES;

export function upgradePlanLimitMedia(reason: UpgradePlanLimitReason): {
	src: string;
	badge: string;
} {
	switch (reason) {
		case "documents.sent.monthly":
			return {
				src: FEATURE_DIALOG_IMAGES.upgradePlanDialogDocumentSendLimit,
				badge: "Upgrade",
			};
		case "envelope.recipients.max":
			return {
				src: FEATURE_DIALOG_IMAGES.upgradePlanDialogRecipientLimit,
				badge: "Upgrade",
			};
		case "features.settlement.basic":
		case "features.settlement.advanced":
			return {
				src: FEATURE_DIALOG_IMAGES.upgradePlanDialogSettlementLimit,
				badge: "Upgrade",
			};
		case "features.routing.advanced":
			return {
				src: FEATURE_DIALOG_IMAGES.upgradePlanDialogTeamsProRouting,
				badge: "Teams Pro",
			};
		case "features.shared_templates":
			return {
				src: FEATURE_DIALOG_IMAGES.upgradePlanDialogSharedTemplatesLimit,
				badge: "Teams",
			};
		case "features.supplementary_attachments":
		case "features.supplementary_attachments.recipient_select":
		case "features.supplementary_attachments.conditional_release":
			return {
				src: FEATURE_DIALOG_IMAGES.upgradePlanDialogSupplementaryAttachmentsLimit,
				badge: "Upgrade",
			};
	}
}
