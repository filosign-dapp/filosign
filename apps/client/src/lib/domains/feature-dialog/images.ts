import type { UpgradePlanLimitReason } from "@filosign/react/billing";

export const FEATURE_DIALOG_IMAGES = {
	billingChangePreviewDialog: "/images/ww/stock_47.webp",
	signSuccessProofPacketDialog: "/images/ww/stock_46.webp",
	recoveryPhraseAndCryptoUnlockDialog: "/images/ww/stock_63.webp",
	workspaceCreateInviteTrialDialog: "/images/ww/stock_44.webp",
	signInOtpAndInviteUnlockDialog: "/images/ww/stock_40.webp",
	upgradePlanDialog: "/images/ww/stock_18.webp",
	payoutAccessRequestDialog: "/images/ww/stock_41.webp",
	postSendEnvelopeSentDialog: "/images/ww/stock_24.webp",
	coldShareAccessDialog: "/images/ww/stock_24.webp",
	feedbackDialog: "/images/stock_10.webp",
} as const;

export type FeatureDialogImageKey = keyof typeof FEATURE_DIALOG_IMAGES;

export function upgradePlanLimitMedia(reason: UpgradePlanLimitReason): {
	src: string;
	badge: string;
} {
	const src = FEATURE_DIALOG_IMAGES.upgradePlanDialog;

	switch (reason) {
		case "documents.sent.monthly":
		case "envelope.recipients.max":
		case "features.settlement.basic":
		case "features.settlement.advanced":
		case "features.supplementary_attachments":
		case "features.supplementary_attachments.recipient_select":
		case "features.supplementary_attachments.conditional_release":
			return { src, badge: "Upgrade" };
		case "features.routing.advanced":
		case "features.signer_replacement":
			return { src, badge: "Teams Pro" };
		case "features.shared_templates":
		case "features.team_drafts":
		case "features.draft_comments":
		case "features.team_collaboration":
		case "features.workspace.create":
			return { src, badge: "Teams" };
	}
	return { src, badge: "Upgrade" };
}
