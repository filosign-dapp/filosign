import { rpcBillingEntitlementsOutputSchema } from "./billing-output";
import {
	rpcFilesArchivalPurchaseOutputSchema,
	rpcFilesArchivalStatusOutputSchema,
} from "./files-archival-output";
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
	rpcPieceDownloadUrlOutputSchema,
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
	rpcSettlementsConfirmSettlementOutputSchema,
	rpcSettlementsListByFileOutputSchema,
	rpcSettlementsTrySettleOutputSchema,
} from "./settlements-output";
import {
	rpcSharingEmailInvitesOutputSchema,
	rpcSharingInviteByIdOutputSchema,
	rpcSharingInviteClaimOutputSchema,
	rpcSharingRequestInviteOutputSchema,
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
	rpcUserRegistrationSnapshotOutputSchema,
	rpcUserSignaturesCreateOutputSchema,
	rpcUserSignaturesGetOutputSchema,
	rpcUserSignaturesListOutputSchema,
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
		list: {
			sent: rpcFilesListSentOutputSchema,
			received: rpcFilesListReceivedOutputSchema,
			org: rpcFilesListSentOutputSchema,
		},
		archival: {
			purchase: rpcFilesArchivalPurchaseOutputSchema,
			status: rpcFilesArchivalStatusOutputSchema,
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
			downloadUrl: rpcPieceDownloadUrlOutputSchema,
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
		emailInvites: rpcSharingEmailInvitesOutputSchema,
		inviteById: rpcSharingInviteByIdOutputSchema,
		inviteClaim: rpcSharingInviteClaimOutputSchema,
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
	settlements: {
		listByFile: rpcSettlementsListByFileOutputSchema,
		trySettle: rpcSettlementsTrySettleOutputSchema,
		confirmSettlement: rpcSettlementsConfirmSettlementOutputSchema,
	},
	users: {
		register: rpcUserRegisterOutputSchema,
		registrationSnapshot: rpcUserRegistrationSnapshotOutputSchema,
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
