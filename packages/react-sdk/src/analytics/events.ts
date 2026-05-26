/** Client-only product analytics event names (PostHog). */
export const CLIENT_ANALYTICS_EVENTS = {
	walletSignup: "wallet_signup",
	onboardingCompleted: "onboarding_completed",
	coldInviteMismatchShown: "cold_invite_mismatch_shown",
	envelopeComposeSubmitted: "envelope_compose_submitted",
	envelopeSendClicked: "envelope_send_clicked",
	envelopeSendSucceeded: "envelope_send_succeeded",
	coldShareDialogShown: "cold_share_dialog_shown",
	envelopePostSendDialogShown: "envelope_post_send_dialog_shown",
} as const;
