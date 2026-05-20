import {
	rpcAuthLogoutOutputSchema,
	rpcAuthNonceOutputSchema,
	rpcAuthRefreshOutputSchema,
	rpcAuthVerifyOutputSchema,
} from "./auth-output";
import { rpcBillingEntitlementsOutputSchema } from "./billing-output";
import {
	rpcColdInviteByTokenOutputSchema,
	rpcColdInviteClaimOutputSchema,
	rpcColdInviteRegenerateOutputSchema,
	rpcFilesListReceivedOutputSchema,
	rpcFilesListSentOutputSchema,
	rpcFilesRegisterOutputSchema,
	rpcFilesUploadStartOutputSchema,
} from "./files-output";
import {
	rpcPieceAckOutputSchema,
	rpcPieceComplianceBundleOutputSchema,
	rpcPieceDetailOutputSchema,
	rpcPieceS3UrlOutputSchema,
	rpcPieceSignDraftFieldIdsOutputSchema,
	rpcPieceSignOutputSchema,
} from "./files-piece-output";
import {
	rpcMetricsInvitesSummaryOutputSchema,
	rpcMetricsSenderUsageOutputSchema,
} from "./metrics-output";
import {
	rpcOrgsConnectionOutputSchema,
	rpcOrgsConnectionsListOutputSchema,
	rpcOrgsCreateOutputSchema,
	rpcOrgsGetOutputSchema,
	rpcOrgsInviteCreateOutputSchema,
	rpcOrgsListMineOutputSchema,
	rpcOrgsMemberOutputSchema,
	rpcOrgsTemplateOutputSchema,
	rpcOrgsTemplatesCloneOutputSchema,
	rpcOrgsTemplatesListOutputSchema,
	rpcOrgsUpdateOutputSchema,
} from "./orgs-output";
import {
	rpcSharingAcceptRequestOutputSchema,
	rpcSharingApproveOutputSchema,
	rpcSharingCancelRequestOutputSchema,
	rpcSharingCanSendToOutputSchema,
	rpcSharingCreateRequestOutputSchema,
	rpcSharingEmailInvitesOutputSchema,
	rpcSharingInviteByIdOutputSchema,
	rpcSharingInviteClaimOutputSchema,
	rpcSharingReceivableFromOutputSchema,
	rpcSharingReceivedRequestsOutputSchema,
	rpcSharingRejectRequestOutputSchema,
	rpcSharingRequestInviteOutputSchema,
	rpcSharingSendableToOutputSchema,
	rpcSharingSentRequestsOutputSchema,
} from "./sharing-output";
import { rpcStoragePresignPutOutputSchema } from "./storage-output";
import { rpcTxProcessIndexerHashOutputSchema } from "./tx-output";
import {
	rpcUserProfileLookupOutputSchema,
	rpcUserProfileMeOutputSchema,
	rpcUserProfilePrevalidateOutputSchema,
	rpcUserProfileSetPrimaryEmailOutputSchema,
	rpcUserProfileSyncPrivyEmailOutputSchema,
	rpcUserProfileUpdateOutputSchema,
	rpcUserRegisterOutputSchema,
	rpcUserSignaturesCreateOutputSchema,
	rpcUserSignaturesGetOutputSchema,
	rpcUserSignaturesListOutputSchema,
} from "./users-output";

/** Nested output schemas aligned with `appRouter` — use in router as `out.auth.nonce`, etc. */
export const rpcOut = {
	auth: {
		nonce: rpcAuthNonceOutputSchema,
		verify: rpcAuthVerifyOutputSchema,
		refresh: rpcAuthRefreshOutputSchema,
		logout: rpcAuthLogoutOutputSchema,
	},
	tx: {
		processIndexerHash: rpcTxProcessIndexerHashOutputSchema,
	},
	storage: {
		presignPut: rpcStoragePresignPutOutputSchema,
	},
	files: {
		uploadStart: rpcFilesUploadStartOutputSchema,
		register: rpcFilesRegisterOutputSchema,
		list: {
			sent: rpcFilesListSentOutputSchema,
			received: rpcFilesListReceivedOutputSchema,
			org: rpcFilesListSentOutputSchema,
		},
		coldInvite: {
			inviteByToken: rpcColdInviteByTokenOutputSchema,
			claim: rpcColdInviteClaimOutputSchema,
			regenerate: rpcColdInviteRegenerateOutputSchema,
		},
		piece: {
			detail: rpcPieceDetailOutputSchema,
			ack: rpcPieceAckOutputSchema,
			signDraftFieldIds: rpcPieceSignDraftFieldIdsOutputSchema,
			s3Url: rpcPieceS3UrlOutputSchema,
			complianceBundle: rpcPieceComplianceBundleOutputSchema,
			sign: rpcPieceSignOutputSchema,
		},
	},
	billing: {
		entitlements: rpcBillingEntitlementsOutputSchema,
	},
	metrics: {
		invitesSummary: rpcMetricsInvitesSummaryOutputSchema,
		senderUsage: rpcMetricsSenderUsageOutputSchema,
	},
	sharing: {
		receivedRequests: rpcSharingReceivedRequestsOutputSchema,
		sentRequests: rpcSharingSentRequestsOutputSchema,
		emailInvites: rpcSharingEmailInvitesOutputSchema,
		canSendTo: rpcSharingCanSendToOutputSchema,
		cancelRequest: rpcSharingCancelRequestOutputSchema,
		rejectRequest: rpcSharingRejectRequestOutputSchema,
		acceptRequest: rpcSharingAcceptRequestOutputSchema,
		approve: rpcSharingApproveOutputSchema,
		receivableFrom: rpcSharingReceivableFromOutputSchema,
		sendableTo: rpcSharingSendableToOutputSchema,
		inviteById: rpcSharingInviteByIdOutputSchema,
		inviteClaim: rpcSharingInviteClaimOutputSchema,
		createRequest: rpcSharingCreateRequestOutputSchema,
		requestInvite: rpcSharingRequestInviteOutputSchema,
	},
	orgs: {
		create: rpcOrgsCreateOutputSchema,
		listMine: rpcOrgsListMineOutputSchema,
		get: rpcOrgsGetOutputSchema,
		update: rpcOrgsUpdateOutputSchema,
		member: rpcOrgsMemberOutputSchema,
		inviteCreate: rpcOrgsInviteCreateOutputSchema,
		connection: rpcOrgsConnectionOutputSchema,
		connectionsList: rpcOrgsConnectionsListOutputSchema,
		template: rpcOrgsTemplateOutputSchema,
		templatesList: rpcOrgsTemplatesListOutputSchema,
		templatesClone: rpcOrgsTemplatesCloneOutputSchema,
	},
	users: {
		register: rpcUserRegisterOutputSchema,
		profileMe: rpcUserProfileMeOutputSchema,
		profileUpdate: rpcUserProfileUpdateOutputSchema,
		profilePrevalidate: rpcUserProfilePrevalidateOutputSchema,
		profileLookup: rpcUserProfileLookupOutputSchema,
		profileSyncPrivyEmail: rpcUserProfileSyncPrivyEmailOutputSchema,
		profileSetPrimaryEmail: rpcUserProfileSetPrimaryEmailOutputSchema,
		signaturesCreate: rpcUserSignaturesCreateOutputSchema,
		signaturesList: rpcUserSignaturesListOutputSchema,
		signaturesGet: rpcUserSignaturesGetOutputSchema,
	},
} as const;
