import {
	archivalProductsOutput,
	archivalPurchaseOutput,
	archivalStatusOutput,
} from "./archival-output";
import {
	rpcAttachmentsLinkOnChainRuleOutputSchema,
	rpcAttachmentsPacketAccessOutputSchema,
	rpcAttachmentsUploadStartOutputSchema,
} from "./attachments-output";
import {
	rpcBillingCheckoutSessionOutputSchema,
	rpcBillingEntitlementsOutputSchema,
	rpcBillingMarketingPreviewOutputSchema,
	rpcBillingOrgPlanChangeOutputSchema,
	rpcBillingOrgSeatPreviewOutputSchema,
	rpcBillingOrgSeatsOutputSchema,
	rpcBillingOrgSummaryOutputSchema,
	rpcBillingPortalSessionOutputSchema,
	rpcBillingUpgradeOfferingsOutputSchema,
	rpcBillingUserSummaryOutputSchema,
	rpcBillingWorkspaceContextOutputSchema,
} from "./billing-output";
import { zDocumentsListInputSchema } from "./documents-input";
import { rpcDocumentsListOutputSchema } from "./documents-output";
import {
	rpcDraftsArchiveOutputSchema,
	rpcDraftsCommentsAppendOutputSchema,
	rpcDraftsCommentsDeleteOutputSchema,
	rpcDraftsCommentsListOutputSchema,
	rpcDraftsCommentsUpdateOutputSchema,
	rpcDraftsCreateOutputSchema,
	rpcDraftsGetOutputSchema,
	rpcDraftsListExternalSharesOutputSchema,
	rpcDraftsMarkSentOutputSchema,
	rpcDraftsPrepareSaveOutputSchema,
	rpcDraftsPresignDocumentsOutputSchema,
	rpcDraftsPresignSnapshotOutputSchema,
	rpcDraftsRenameOutputSchema,
	rpcDraftsReviewByTokenOutputSchema,
	rpcDraftsReviewForWalletOutputSchema,
	rpcDraftsRevokeExternalShareOutputSchema,
	rpcDraftsSaveOutputSchema,
	rpcDraftsShareExternalOutputSchema,
} from "./drafts-output";
import {
	rpcColdInviteByTokenOutputSchema,
	rpcColdInviteClaimOutputSchema,
	rpcColdInviteRegenerateOutputSchema,
	rpcFilesCancelSignerReplacementOutputSchema,
	rpcFilesClearEnvelopeSignaturesOutputSchema,
	rpcFilesCommentsAppendOutputSchema,
	rpcFilesCommentsListOutputSchema,
	rpcFilesExecuteSignerReplacementOutputSchema,
	rpcFilesProposeSignerReplacementOutputSchema,
	rpcFilesRecallEnvelopeOutputSchema,
	rpcFilesRegisterOutputSchema,
	rpcFilesRemindSignersOutputSchema,
	rpcFilesUploadStartOutputSchema,
} from "./files-output";
import {
	rpcPieceAckOutputSchema,
	rpcPieceComplianceBundleOutputSchema,
	rpcPieceDetailOutputSchema,
	rpcPieceDownloadUrlOutputSchema,
	rpcPieceRecordViewOutputSchema,
	rpcPieceSignDraftFieldIdsOutputSchema,
	rpcPieceSignOutputSchema,
} from "./files-piece-output";
import {
	zNotificationsDismissInputSchema,
	zNotificationsInboxInputSchema,
} from "./notifications-input";
import {
	rpcNotificationsDismissOutputSchema,
	rpcNotificationsInboxOutputSchema,
} from "./notifications-output";

export type { RpcPieceDetailOutput } from "./files-piece-output";

import {
	rpcMetricsInvitesSummaryOutputSchema,
	rpcMetricsSenderUsageOutputSchema,
} from "./metrics-output";
import {
	rpcOrgsCreateOutputSchema,
	rpcOrgsGetOutputSchema,
	rpcOrgsInviteCreateOutputSchema,
	rpcOrgsLinkWalletOutputSchema,
	rpcOrgsListMineOutputSchema,
	rpcOrgsMemberOutputSchema,
	rpcOrgsTemplateOutputSchema,
	rpcOrgsTemplatesCloneOutputSchema,
	rpcOrgsTemplatesListOutputSchema,
	rpcOrgsUnlinkWalletOutputSchema,
	rpcOrgsUpdateOutputSchema,
} from "./orgs-output";
import {
	rpcPlatformAdminAccessRequestsListOutputSchema,
	rpcPlatformAdminInviteCreateOutputSchema,
	rpcPlatformAdminInviteRebookOutputSchema,
	rpcPlatformAdminInviteSendOutputSchema,
	rpcPlatformAdminInvitesListOutputSchema,
	rpcPlatformAdminSettlementAccessDecisionOutputSchema,
	rpcPlatformAdminSettlementAccessListOutputSchema,
	rpcPlatformAdminUsersListOutputSchema,
} from "./platform-admin-output";
import {
	rpcSettlementsCancelRuleOutputSchema,
	rpcSettlementsConfirmSettlementOutputSchema,
	rpcSettlementsListByFileOutputSchema,
	rpcSettlementsRegisterForFileOutputSchema,
	rpcSettlementsTrySettleOutputSchema,
	rpcSettlementsUpdateRuleOutputSchema,
} from "./settlements-output";
import { rpcStoragePresignPutOutputSchema } from "./storage-output";
import { rpcTxProcessIndexerHashOutputSchema } from "./tx-output";
import {
	rpcUserActivationGetOutputSchema,
	rpcUserActivationMarkOutputSchema,
	rpcUserEraseAccountOutputSchema,
	rpcUserExportAccountDataOutputSchema,
	rpcUserPrivacyRequestCreateOutputSchema,
	rpcUserPrivacyRequestListOutputSchema,
	rpcUserPrivacyRequestTransitionOutputSchema,
	rpcUserPrivacyStateOutputSchema,
	rpcUserProfileLookupOutputSchema,
	rpcUserProfileMeOutputSchema,
	rpcUserProfilePrevalidateOutputSchema,
	rpcUserProfileSetPrimaryEmailOutputSchema,
	rpcUserProfileSyncThirdwebEmailOutputSchema,
	rpcUserProfileUpdateOutputSchema,
	rpcUserRegisterOutputSchema,
	rpcUserRegistrationSnapshotOutputSchema,
	rpcUserSetAnalyticsConsentOutputSchema,
	rpcUserSignaturesCreateOutputSchema,
	rpcUserSignaturesDeleteOutputSchema,
	rpcUserSignaturesGetOutputSchema,
	rpcUserSignaturesListOutputSchema,
	rpcUserSignaturesSetDefaultOutputSchema,
} from "./users-output";

/** Nested output schemas aligned with `appRouter`. */
export const rpcOut = {
	tx: {
		processIndexerHash: rpcTxProcessIndexerHashOutputSchema,
	},
	storage: {
		presignPut: rpcStoragePresignPutOutputSchema,
	},
	files: {
		uploadStart: rpcFilesUploadStartOutputSchema,
		register: rpcFilesRegisterOutputSchema,
		proposeSignerReplacement: rpcFilesProposeSignerReplacementOutputSchema,
		executeSignerReplacement: rpcFilesExecuteSignerReplacementOutputSchema,
		cancelSignerReplacement: rpcFilesCancelSignerReplacementOutputSchema,
		recallEnvelope: rpcFilesRecallEnvelopeOutputSchema,
		clearEnvelopeSignatures: rpcFilesClearEnvelopeSignaturesOutputSchema,
		remindSigners: rpcFilesRemindSignersOutputSchema,
		comments: {
			list: rpcFilesCommentsListOutputSchema,
			append: rpcFilesCommentsAppendOutputSchema,
		},
		coldInvite: {
			inviteByToken: rpcColdInviteByTokenOutputSchema,
			claim: rpcColdInviteClaimOutputSchema,
			regenerate: rpcColdInviteRegenerateOutputSchema,
		},
		piece: {
			detail: rpcPieceDetailOutputSchema,
			ack: rpcPieceAckOutputSchema,
			recordView: rpcPieceRecordViewOutputSchema,
			signDraftFieldIds: rpcPieceSignDraftFieldIdsOutputSchema,
			downloadUrl: rpcPieceDownloadUrlOutputSchema,
			complianceBundle: rpcPieceComplianceBundleOutputSchema,
			sign: rpcPieceSignOutputSchema,
		},
	},
	archival: {
		products: archivalProductsOutput,
		purchase: archivalPurchaseOutput,
		status: archivalStatusOutput,
	},
	billing: {
		entitlements: rpcBillingEntitlementsOutputSchema,
		createCheckoutSession: rpcBillingCheckoutSessionOutputSchema,
		createPortalSession: rpcBillingPortalSessionOutputSchema,
		getOrgSummary: rpcBillingOrgSummaryOutputSchema,
		previewOrgSeatChange: rpcBillingOrgSeatPreviewOutputSchema,
		updateOrgSeats: rpcBillingOrgSeatsOutputSchema,
		previewOrgPlanChange: rpcBillingOrgSeatPreviewOutputSchema,
		changeOrgPlan: rpcBillingOrgPlanChangeOutputSchema,
		getUserSummary: rpcBillingUserSummaryOutputSchema,
		getWorkspaceBillingContext: rpcBillingWorkspaceContextOutputSchema,
		getUpgradeOfferings: rpcBillingUpgradeOfferingsOutputSchema,
		previewMarketingCheckout: rpcBillingMarketingPreviewOutputSchema,
	},
	metrics: {
		invitesSummary: rpcMetricsInvitesSummaryOutputSchema,
		senderUsage: rpcMetricsSenderUsageOutputSchema,
	},
	orgs: {
		create: rpcOrgsCreateOutputSchema,
		listMine: rpcOrgsListMineOutputSchema,
		get: rpcOrgsGetOutputSchema,
		linkWallet: rpcOrgsLinkWalletOutputSchema,
		unlinkWallet: rpcOrgsUnlinkWalletOutputSchema,
		update: rpcOrgsUpdateOutputSchema,
		member: rpcOrgsMemberOutputSchema,
		inviteCreate: rpcOrgsInviteCreateOutputSchema,
		template: rpcOrgsTemplateOutputSchema,
		templatesList: rpcOrgsTemplatesListOutputSchema,
		templatesClone: rpcOrgsTemplatesCloneOutputSchema,
	},
	attachments: {
		uploadStart: rpcAttachmentsUploadStartOutputSchema,
		packetAccess: rpcAttachmentsPacketAccessOutputSchema,
		linkOnChainRule: rpcAttachmentsLinkOnChainRuleOutputSchema,
	},
	settlements: {
		listByFile: rpcSettlementsListByFileOutputSchema,
		trySettle: rpcSettlementsTrySettleOutputSchema,
		confirmSettlement: rpcSettlementsConfirmSettlementOutputSchema,
		registerForFile: rpcSettlementsRegisterForFileOutputSchema,
		updateRule: rpcSettlementsUpdateRuleOutputSchema,
		cancelRule: rpcSettlementsCancelRuleOutputSchema,
	},
	platformAdmin: {
		invitesList: rpcPlatformAdminInvitesListOutputSchema,
		inviteCreate: rpcPlatformAdminInviteCreateOutputSchema,
		inviteRebook: rpcPlatformAdminInviteRebookOutputSchema,
		inviteSend: rpcPlatformAdminInviteSendOutputSchema,
		usersList: rpcPlatformAdminUsersListOutputSchema,
		accessRequestsList: rpcPlatformAdminAccessRequestsListOutputSchema,
		settlementAccessList: rpcPlatformAdminSettlementAccessListOutputSchema,
		settlementAccessDecision:
			rpcPlatformAdminSettlementAccessDecisionOutputSchema,
	},
	documents: {
		list: rpcDocumentsListOutputSchema,
	},
	notifications: {
		inbox: rpcNotificationsInboxOutputSchema,
		dismiss: rpcNotificationsDismissOutputSchema,
	},
	drafts: {
		create: rpcDraftsCreateOutputSchema,
		save: rpcDraftsSaveOutputSchema,
		get: rpcDraftsGetOutputSchema,
		presignSnapshot: rpcDraftsPresignSnapshotOutputSchema,
		prepareSave: rpcDraftsPrepareSaveOutputSchema,
		presignDocuments: rpcDraftsPresignDocumentsOutputSchema,
		shareExternal: rpcDraftsShareExternalOutputSchema,
		listExternalShares: rpcDraftsListExternalSharesOutputSchema,
		revokeExternalShare: rpcDraftsRevokeExternalShareOutputSchema,
		reviewByToken: rpcDraftsReviewByTokenOutputSchema,
		reviewForWallet: rpcDraftsReviewForWalletOutputSchema,
		markSent: rpcDraftsMarkSentOutputSchema,
		archive: rpcDraftsArchiveOutputSchema,
		rename: rpcDraftsRenameOutputSchema,
		commentsList: rpcDraftsCommentsListOutputSchema,
		commentsAppend: rpcDraftsCommentsAppendOutputSchema,
		commentsUpdate: rpcDraftsCommentsUpdateOutputSchema,
		commentsDelete: rpcDraftsCommentsDeleteOutputSchema,
	},
	users: {
		register: rpcUserRegisterOutputSchema,
		registrationSnapshot: rpcUserRegistrationSnapshotOutputSchema,
		profileMe: rpcUserProfileMeOutputSchema,
		profileUpdate: rpcUserProfileUpdateOutputSchema,
		profilePrevalidate: rpcUserProfilePrevalidateOutputSchema,
		profileLookup: rpcUserProfileLookupOutputSchema,
		profileSyncThirdwebEmail: rpcUserProfileSyncThirdwebEmailOutputSchema,
		profileSetPrimaryEmail: rpcUserProfileSetPrimaryEmailOutputSchema,
		eraseAccount: rpcUserEraseAccountOutputSchema,
		privacyState: rpcUserPrivacyStateOutputSchema,
		privacyRequestCreate: rpcUserPrivacyRequestCreateOutputSchema,
		privacyRequestList: rpcUserPrivacyRequestListOutputSchema,
		privacyRequestTransition: rpcUserPrivacyRequestTransitionOutputSchema,
		setAnalyticsConsent: rpcUserSetAnalyticsConsentOutputSchema,
		exportAccountData: rpcUserExportAccountDataOutputSchema,
		signaturesCreate: rpcUserSignaturesCreateOutputSchema,
		signaturesList: rpcUserSignaturesListOutputSchema,
		signaturesGet: rpcUserSignaturesGetOutputSchema,
		signaturesSetDefault: rpcUserSignaturesSetDefaultOutputSchema,
		signaturesDelete: rpcUserSignaturesDeleteOutputSchema,
		activationGet: rpcUserActivationGetOutputSchema,
		activationMark: rpcUserActivationMarkOutputSchema,
	},
} as const;

export {
	zDraftCommentAppendBody as zDraftCommentAppendInput,
	zDraftCommentDeleteBody as zDraftCommentDeleteInput,
	zDraftCommentUpdateBody as zDraftCommentUpdateInput,
} from "@/lib/domains/drafts";
export { zFileCommentAppendBody as zFilesCommentAppendInput } from "@/lib/domains/files";
export {
	zPlatformAdminInviteCreateInput,
	zPlatformAdminSetFeatureOverridesInput,
	zPlatformAdminSetPlanInput,
} from "./platform-admin-output";
export {
	zDocumentsListInputSchema,
	zNotificationsDismissInputSchema,
	zNotificationsInboxInputSchema,
};
