export {
	FILOSIGN_FOOTER_LINKS,
	FILOSIGN_FOOTER_TAGLINE,
	filosignFooterLinks,
} from "./constants";
export {
	FILOSIGN_CONTACT_EMAILS,
	FILOSIGN_TRANSACTIONAL_EMAIL_CHANNELS,
	type FilosignContactEmail,
	type FilosignTransactionalEmailKind,
	filosignContactEmail,
	filosignMailto,
	replyToForTransactionalEmail,
} from "./contact-emails";
export {
	PARTNER_INVITE_COLD_MIDDLE,
	PARTNER_INVITE_DEFAULT_MIDDLE,
	PARTNER_INVITE_WARM_MIDDLE,
	type PartnerInviteCopyInput,
	type PartnerInviteEmailVariant,
	partnerInviteCopy,
	partnerInviteSubject,
} from "./copy/partner-invite";
export {
	emailAssetUrl,
	filosignEmailAssets,
	getEmailAssetBaseUrl,
	themeAssetUrl,
} from "./email-assets";
export {
	type AccessRequestApprovedEmailProps,
	renderAccessRequestApproved,
} from "./render-access-request-approved";
export {
	type CheckoutContinueEmailProps,
	renderCheckoutContinue,
} from "./render-checkout-continue";
export {
	type DocumentSharedContext,
	type DocumentSharedEmailProps,
	type DocumentSharedIntent,
	type DocumentSharedVariant,
	documentSharedCopy,
	documentSharedSubject,
	renderDocumentShared,
} from "./render-document-shared";
export {
	type EnvelopeCompletedEmailProps,
	renderEnvelopeCompleted,
} from "./render-envelope-completed";
export {
	type PaidSetupEmailProps,
	renderPaidSetup,
} from "./render-paid-setup";
export {
	type PartnerInviteEmailProps,
	renderPartnerInvite,
} from "./render-partner-invite";
export { filosignEmailColors } from "./tokens";
