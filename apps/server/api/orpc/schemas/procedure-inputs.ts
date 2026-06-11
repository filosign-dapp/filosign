/** Router `.input()` schemas — single import surface (sources live in domains/handlers). */

export { zOrgsTemplateCreateBody } from "@/api/handlers/orgs/connections-templates";
export {
	zOrgsCreateBody,
	zOrgsLinkWalletBody,
	zOrgsMembersRemoveBody,
	zOrgsMembersSetRoleBody,
	zOrgsUnlinkWalletBody,
	zOrgsUpdateBody,
} from "@/api/handlers/orgs/core";
export {
	zOrgsInviteCreateBody,
	zOrgsKeysPublishWrapBody,
} from "@/api/handlers/orgs/invites-keys";
export { zUserRegisterBody } from "@/api/handlers/users/register";
export {
	zUserSignatureCreateBody,
	zUserSignatureSetDefaultBody,
} from "@/api/handlers/users/signatures";
export {
	zDraftCreateBody,
	zDraftMarkSentBody,
} from "@/lib/domains/drafts/lifecycle";
export {
	zDraftPrepareSaveBody,
	zDraftPresignDocumentsBody,
	zDraftSaveBody,
} from "@/lib/domains/drafts/save";
export {
	zDraftCommentAppendBody,
	zDraftCommentDeleteBody,
	zDraftCommentUpdateBody,
	zDraftRevokeExternalShareBody,
	zDraftShareExternalBody,
} from "@/lib/domains/drafts/share";
export { zPieceSignDraftPutBody } from "@/lib/domains/files/draft";
export {
	zColdInviteClaimBody,
	zColdInviteRegenerateBody,
} from "@/lib/domains/files/invites";
export { zPieceAckBody } from "@/lib/domains/files/piece";
export {
	zUserProfilePutBody,
	zUserSetPrimaryEmailBody,
	zUserSyncThirdwebEmailBody,
} from "@/lib/domains/users/profile";
