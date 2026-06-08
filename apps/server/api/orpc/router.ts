import {
	DEPLOYMENTS,
	SIGNUP_POLICIES,
	zSettlementRuleCancelInput,
	zSettlementRuleKey,
	zSettlementRuleUpdateInput,
} from "@filosign/shared";
import { zHexString } from "@filosign/shared/zod";
import type { RouterClient } from "@orpc/server";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import {
	archivalProducts,
	archivalPurchase,
	archivalStatus,
} from "@/api/handlers/archival-handlers";
import {
	attachmentsLinkOnChainRuleHandler,
	attachmentsPacketAccessHandler,
} from "@/api/handlers/attachments";
import {
	billingChangeOrgPlan,
	billingCreateCheckoutSession,
	billingCreateOrgCheckoutSession,
	billingCreateOrgPortalSession,
	billingCreatePortalSession,
	billingEntitlements,
	billingGetOrgSummary,
	billingGetUpgradeOfferings,
	billingGetUserSummary,
	billingGetWorkspaceBillingContext,
	billingPreviewMarketingCheckout,
	billingPreviewOrgPlanChange,
	billingPreviewOrgSeatChange,
	billingRequestCheckoutLink,
	billingResendSetupLink,
	billingUpdateOrgSeats,
} from "@/api/handlers/billing-handlers";
import * as documentHandlers from "@/api/handlers/documents";
import * as draftHandlers from "@/api/handlers/drafts";
import * as fileHandlers from "@/api/handlers/files";
import {
	metricsInvitesSummary,
	metricsSenderUsage,
} from "@/api/handlers/metrics-handlers";
import * as notificationHandlers from "@/api/handlers/notifications";
import * as orgsHandlers from "@/api/handlers/orgs";
import {
	platformAccessPreviewGate,
	platformAccessSubmitAccessRequest,
	platformAdminAccess,
	platformAdminAccessRequestsApprove,
	platformAdminAccessRequestsList,
	platformAdminAccessRequestsReject,
	platformAdminInvitesCreate,
	platformAdminInvitesList,
	platformAdminInvitesRebook,
	platformAdminInvitesRevoke,
	platformAdminUsersList,
	platformAdminUsersSetFeatureOverrides,
	platformAdminUsersSetPlan,
	zGatePreviewOutput,
} from "@/api/handlers/platform-access-handlers";
import {
	settlementAccessGetForOrg,
	settlementAccessSubmitRequest,
	settlementAdminApproveAccess,
	settlementAdminListAccessRequests,
	settlementAdminRejectAccess,
} from "@/api/handlers/settlement-access-handlers";
import {
	settlementsCancelRule,
	settlementsConfirmSettlement,
	settlementsListByFile,
	settlementsRegisterForFile,
	settlementsTrySettle,
	settlementsUpdateRule,
	zSettlementRulesRegisterBatch,
} from "@/api/handlers/settlements";
import * as sharingHandlers from "@/api/handlers/sharing";
import {
	storagePresignPut,
	zStoragePresignPutInput,
} from "@/api/handlers/storage-handlers";
import { txProcessIndexerHash } from "@/api/handlers/tx";
import * as userHandlers from "@/api/handlers/users";
import { filesPieceRouter } from "@/api/orpc/routers/files-piece";
import { zLinkAttachmentOnChainRuleInput } from "@/lib/domains/attachments";
import {
	CHECKOUT_PLAN_IDS,
	UPGRADE_LIMIT_REASONS,
} from "@/lib/domains/billing";
import {
	zDraftCommentAppendBody,
	zDraftCommentDeleteBody,
	zDraftCommentUpdateBody,
} from "@/lib/domains/drafts";
import { zFileCommentAppendBody, zFileRegisterBody } from "@/lib/domains/files";
import { loadPlatformRuntime } from "@/lib/domains/runtime";
import { zIndexerTxBody } from "@/lib/platform/validation/tx-registration";
import {
	authenticatedProcedure,
	orgProcedure,
	publicProcedure,
} from "./procedures";
import {
	rpcOut as out,
	zDocumentsListInputSchema,
	zNotificationsDismissInputSchema,
	zNotificationsInboxInputSchema,
	zPlatformAdminInviteCreateInput,
	zPlatformAdminSetFeatureOverridesInput,
	zPlatformAdminSetPlanInput,
} from "./schemas";
import {
	zColdInviteClaimBody,
	zColdInviteRegenerateBody,
	zDraftCreateBody,
	zDraftMarkSentBody,
	zDraftPrepareSaveBody,
	zDraftPresignDocumentsBody,
	zDraftRevokeExternalShareBody,
	zDraftSaveBody,
	zDraftShareExternalBody,
	zOrgsConnectionAddBody,
	zOrgsConnectionRevokeBody,
	zOrgsCreateBody,
	zOrgsInviteCreateBody,
	zOrgsKeysPublishWrapBody,
	zOrgsLinkWalletBody,
	zOrgsMembersRemoveBody,
	zOrgsMembersSetRoleBody,
	zOrgsTemplateCreateBody,
	zOrgsUnlinkWalletBody,
	zOrgsUpdateBody,
	zSharingRequestInviteBody,
	zUserProfilePutBody,
	zUserRegisterBody,
	zUserSetPrimaryEmailBody,
	zUserSignatureCreateBody,
	zUserSignatureSetDefaultBody,
	zUserSyncThirdwebEmailBody,
} from "./schemas/procedure-inputs";
import { zViemChain } from "./schemas/runtime-output";

const platformRuntimeSchema = z.object({
	uptime: z.number(),
	chain: zViemChain,
	chainKey: z.enum(["local", "testnet", "mainnet"]),
	deployment: z.enum(DEPLOYMENTS),
	signupPolicy: z.enum(SIGNUP_POLICIES),
});

export const appRouter = {
	healthCheck: publicProcedure
		.output(z.literal("OK"))
		.handler(() => "OK" as const),
	runtime: publicProcedure.output(platformRuntimeSchema).handler(async () => {
		const r = await loadPlatformRuntime();
		return {
			uptime: r.uptime,
			chain: r.chain,
			chainKey: r.chainKey,
			deployment: r.deployment,
			signupPolicy: r.signupPolicy,
		};
	}),
	platformAccess: {
		previewGate: publicProcedure
			.input(
				z.object({
					platformInvite: z.string().optional(),
					setup: z.string().optional(),
					coldInvite: z.string().optional(),
					coldPieceCid: z.string().optional(),
					email: z.string().optional(),
				}),
			)
			.output(zGatePreviewOutput)
			.handler(({ input }) => platformAccessPreviewGate(input)),
		submitAccessRequest: publicProcedure
			.input(
				z.object({
					email: z.email(),
					name: z.string().max(120).optional(),
					company: z.string().max(120).optional(),
					message: z.string().max(2000).optional(),
				}),
			)
			.output(z.object({ ok: z.literal(true) }))
			.handler(({ input }) => platformAccessSubmitAccessRequest(input)),
	},
	platformAdmin: {
		access: authenticatedProcedure
			.output(z.object({ isAdmin: z.boolean() }))
			.handler(({ context }) => platformAdminAccess(context.userWallet)),
		invites: {
			list: authenticatedProcedure
				.output(out.platformAdmin.invitesList)
				.handler(({ context }) => platformAdminInvitesList(context.userWallet)),
			create: authenticatedProcedure
				.input(zPlatformAdminInviteCreateInput)
				.output(out.platformAdmin.inviteCreate)
				.handler(({ context, input }) =>
					platformAdminInvitesCreate(context.userWallet, input),
				),
			revoke: authenticatedProcedure
				.input(z.object({ inviteId: z.uuid() }))
				.output(z.object({ ok: z.literal(true) }))
				.handler(({ context, input }) =>
					platformAdminInvitesRevoke(context.userWallet, input.inviteId),
				),
			rebook: authenticatedProcedure
				.input(z.object({ inviteId: z.uuid() }))
				.output(out.platformAdmin.inviteRebook)
				.handler(({ context, input }) =>
					platformAdminInvitesRebook(context.userWallet, input.inviteId),
				),
		},
		users: {
			list: authenticatedProcedure
				.output(out.platformAdmin.usersList)
				.handler(({ context }) => platformAdminUsersList(context.userWallet)),
			setFeatureOverrides: authenticatedProcedure
				.input(zPlatformAdminSetFeatureOverridesInput)
				.output(z.object({ ok: z.literal(true) }))
				.handler(({ context, input }) =>
					platformAdminUsersSetFeatureOverrides(context.userWallet, input),
				),
			setPlan: authenticatedProcedure
				.input(zPlatformAdminSetPlanInput)
				.output(z.object({ ok: z.literal(true) }))
				.handler(({ context, input }) =>
					platformAdminUsersSetPlan(context.userWallet, input),
				),
		},
		accessRequests: {
			list: authenticatedProcedure
				.output(out.platformAdmin.accessRequestsList)
				.handler(({ context }) =>
					platformAdminAccessRequestsList(context.userWallet),
				),
			approve: authenticatedProcedure
				.input(
					z.object({
						requestId: z.uuid(),
						planId: z
							.enum(["free", "individual", "teams", "teams_pro", "enterprise"])
							.optional(),
						trialDays: z.number().int().min(1).max(365).optional(),
					}),
				)
				.output(
					z.object({
						inviteToken: z.string(),
						inviteUrl: z.string(),
					}),
				)
				.handler(({ context, input }) =>
					platformAdminAccessRequestsApprove(context.userWallet, input),
				),
			reject: authenticatedProcedure
				.input(z.object({ requestId: z.uuid() }))
				.output(z.object({ ok: z.literal(true) }))
				.handler(({ context, input }) =>
					platformAdminAccessRequestsReject(
						context.userWallet,
						input.requestId,
					),
				),
		},
		settlementFeatureAccess: {
			list: authenticatedProcedure
				.output(out.platformAdmin.settlementAccessList)
				.handler(({ context }) =>
					settlementAdminListAccessRequests(context.userWallet),
				),
			approve: authenticatedProcedure
				.input(
					z.object({
						organizationId: z.uuid(),
						reviewNote: z.string().max(2000).optional(),
					}),
				)
				.output(out.platformAdmin.settlementAccessDecision)
				.handler(({ context, input }) =>
					settlementAdminApproveAccess(context.userWallet, input),
				),
			reject: authenticatedProcedure
				.input(
					z.object({
						organizationId: z.uuid(),
						reviewNote: z.string().max(2000).optional(),
					}),
				)
				.output(out.platformAdmin.settlementAccessDecision)
				.handler(({ context, input }) =>
					settlementAdminRejectAccess(context.userWallet, input),
				),
		},
	},
	drafts: {
		create: orgProcedure
			.input(zDraftCreateBody)
			.output(out.drafts.create)
			.handler(({ context, input }) =>
				draftHandlers.draftsCreate(
					context.userWallet,
					context.activeOrg,
					input,
				),
			),
		save: orgProcedure
			.input(zDraftSaveBody)
			.output(out.drafts.save)
			.handler(({ context, input }) =>
				draftHandlers.draftsSave(context.userWallet, context.activeOrg, input),
			),
		get: orgProcedure
			.input(z.object({ draftId: z.uuid() }))
			.output(out.drafts.get)
			.handler(({ context, input }) =>
				draftHandlers.draftsGet(
					context.userWallet,
					context.activeOrg,
					input.draftId,
				),
			),
		presignSnapshot: orgProcedure
			.input(z.object({ draftId: z.uuid() }))
			.output(out.drafts.presignSnapshot)
			.handler(({ context, input }) =>
				draftHandlers.draftsPresignSnapshot(
					context.userWallet,
					context.activeOrg,
					input.draftId,
				),
			),
		prepareSave: orgProcedure
			.input(zDraftPrepareSaveBody)
			.output(out.drafts.prepareSave)
			.handler(({ context, input }) =>
				draftHandlers.draftsPrepareSave(
					context.userWallet,
					context.activeOrg,
					input,
				),
			),
		presignDocuments: orgProcedure
			.input(zDraftPresignDocumentsBody)
			.output(out.drafts.presignDocuments)
			.handler(({ context, input }) =>
				draftHandlers.draftsPresignDocuments(
					context.userWallet,
					context.activeOrg,
					input,
				),
			),
		shareExternal: orgProcedure
			.input(zDraftShareExternalBody)
			.output(out.drafts.shareExternal)
			.handler(({ context, input }) =>
				draftHandlers.draftsShareExternal(
					context.userWallet,
					context.activeOrg,
					input,
				),
			),
		listExternalShares: orgProcedure
			.input(z.object({ draftId: z.uuid() }))
			.output(out.drafts.listExternalShares)
			.handler(({ context, input }) =>
				draftHandlers.draftsListExternalShares(
					context.userWallet,
					context.activeOrg,
					input.draftId,
				),
			),
		revokeExternalShare: orgProcedure
			.input(zDraftRevokeExternalShareBody)
			.output(out.drafts.revokeExternalShare)
			.handler(({ context, input }) =>
				draftHandlers.draftsRevokeExternalShare(
					context.userWallet,
					context.activeOrg,
					input,
				),
			),
		reviewByToken: publicProcedure
			.input(z.object({ inviteToken: z.string().min(8) }))
			.output(out.drafts.reviewByToken)
			.handler(({ input }) =>
				draftHandlers.draftsReviewByToken(input.inviteToken),
			),
		reviewForWallet: authenticatedProcedure
			.input(z.object({ inviteToken: z.string().min(8) }))
			.output(out.drafts.reviewForWallet)
			.handler(({ context, input }) =>
				draftHandlers.draftsReviewForWallet(
					context.userWallet,
					input.inviteToken,
				),
			),
		markSent: orgProcedure
			.input(zDraftMarkSentBody)
			.output(out.drafts.markSent)
			.handler(({ context, input }) =>
				draftHandlers.draftsMarkSent(
					context.userWallet,
					context.activeOrg,
					input,
				),
			),
		archive: orgProcedure
			.input(z.object({ draftId: z.uuid() }))
			.output(out.drafts.archive)
			.handler(({ context, input }) =>
				draftHandlers.draftsArchive(
					context.userWallet,
					context.activeOrg,
					input,
				),
			),
		rename: orgProcedure
			.input(
				z.object({
					draftId: z.uuid(),
					title: z.string().min(1).max(200),
				}),
			)
			.output(out.drafts.rename)
			.handler(({ context, input }) =>
				draftHandlers.draftsRename(
					context.userWallet,
					context.activeOrg,
					input,
				),
			),
		comments: {
			list: orgProcedure
				.input(z.object({ draftId: z.uuid() }))
				.output(out.drafts.commentsList)
				.handler(({ context, input }) =>
					draftHandlers.draftsCommentsList(
						context.userWallet,
						context.activeOrg,
						input.draftId,
					),
				),
			append: orgProcedure
				.input(zDraftCommentAppendBody)
				.output(out.drafts.commentsAppend)
				.handler(({ context, input }) =>
					draftHandlers.draftsCommentsAppend(
						context.userWallet,
						context.activeOrg,
						input,
					),
				),
			update: orgProcedure
				.input(zDraftCommentUpdateBody)
				.output(out.drafts.commentsUpdate)
				.handler(({ context, input }) =>
					draftHandlers.draftsCommentsUpdate(
						context.userWallet,
						context.activeOrg,
						input,
					),
				),
			delete: orgProcedure
				.input(zDraftCommentDeleteBody)
				.output(out.drafts.commentsDelete)
				.handler(({ context, input }) =>
					draftHandlers.draftsCommentsDelete(
						context.userWallet,
						context.activeOrg,
						input,
					),
				),
		},
	},
	documents: {
		list: authenticatedProcedure
			.input(zDocumentsListInputSchema)
			.output(out.documents.list)
			.handler(({ context, input }) =>
				documentHandlers.documentsListHandler(
					context.userWallet,
					context.activeOrg,
					input,
				),
			),
	},
	notifications: {
		inbox: authenticatedProcedure
			.input(zNotificationsInboxInputSchema)
			.output(out.notifications.inbox)
			.handler(({ context, input }) =>
				notificationHandlers.notificationsInboxHandler(
					context.userWallet,
					input,
				),
			),
		dismiss: authenticatedProcedure
			.input(zNotificationsDismissInputSchema)
			.output(out.notifications.dismiss)
			.handler(({ context, input }) =>
				notificationHandlers.notificationsDismissHandler(
					context.userWallet,
					input,
				),
			),
	},
	attachments: {
		uploadStart: authenticatedProcedure
			.input(z.object({ packetCid: z.string().min(8) }))
			.output(out.attachments.uploadStart)
			.handler(({ context, input }) =>
				fileHandlers.filesAttachmentUploadStart(context.userWallet, input),
			),
		packetAccess: authenticatedProcedure
			.input(
				z.object({
					pieceCid: z.string().min(8),
					packetId: z.string().min(1),
				}),
			)
			.output(out.attachments.packetAccess)
			.handler(({ context, input }) =>
				attachmentsPacketAccessHandler(context.userWallet, input),
			),
		linkOnChainRule: authenticatedProcedure
			.input(zLinkAttachmentOnChainRuleInput)
			.output(out.attachments.linkOnChainRule)
			.handler(({ context, input }) =>
				attachmentsLinkOnChainRuleHandler(context.userWallet, input),
			),
	},
	settlements: {
		listByFile: authenticatedProcedure
			.input(z.object({ pieceCid: z.string().min(1) }))
			.output(out.settlements.listByFile)
			.handler(({ context, input }) =>
				settlementsListByFile(context.userWallet, input.pieceCid),
			),
		trySettle: authenticatedProcedure
			.input(zSettlementRuleKey)
			.output(out.settlements.trySettle)
			.handler(({ context, input }) =>
				settlementsTrySettle(context.userWallet, {
					onChainRuleId: input.onChainRuleId,
					validatorAddress: input.validatorAddress,
				}),
			),
		confirmSettlement: authenticatedProcedure
			.input(
				zSettlementRuleKey.extend({
					payoutTxHash: zHexString,
				}),
			)
			.output(out.settlements.confirmSettlement)
			.handler(({ context, input }) =>
				settlementsConfirmSettlement(context.userWallet, {
					onChainRuleId: input.onChainRuleId,
					validatorAddress: input.validatorAddress,
					payoutTxHash: input.payoutTxHash as `0x${string}`,
				}),
			),
		registerForFile: authenticatedProcedure
			.input(
				z.object({
					pieceCid: z.string().min(1),
					organizationId: z.uuid().optional(),
					rules: zSettlementRulesRegisterBatch.min(1),
				}),
			)
			.output(out.settlements.registerForFile)
			.handler(({ context, input }) =>
				settlementsRegisterForFile(context.userWallet, input),
			),
		updateRule: authenticatedProcedure
			.input(zSettlementRuleUpdateInput)
			.output(out.settlements.updateRule)
			.handler(({ context, input }) =>
				settlementsUpdateRule(context.userWallet, input),
			),
		cancelRule: authenticatedProcedure
			.input(zSettlementRuleCancelInput)
			.output(out.settlements.cancelRule)
			.handler(({ context, input }) =>
				settlementsCancelRule(context.userWallet, input),
			),
	},
	tx: {
		processIndexerHash: authenticatedProcedure
			.input(
				z.object({
					hash: z.string(),
					body: zIndexerTxBody.optional(),
				}),
			)
			.output(out.tx.processIndexerHash)
			.handler(({ input }) =>
				txProcessIndexerHash({ hash: input.hash }, input.body ?? {}),
			),
	},
	storage: {
		presignPut: authenticatedProcedure
			.input(zStoragePresignPutInput)
			.output(out.storage.presignPut)
			.handler(({ context, input }) =>
				storagePresignPut(context.userWallet, input),
			),
	},
	files: {
		uploadStart: authenticatedProcedure
			.input(fileHandlers.zUploadStartBody)
			.output(out.files.uploadStart)
			.handler(({ context, input }) =>
				fileHandlers.filesUploadStart(context.userWallet, input),
			),
		register: authenticatedProcedure
			.input(zFileRegisterBody)
			.output(out.files.register)
			.handler(({ context, input }) =>
				fileHandlers.filesRegister(
					context.userWallet,
					input,
					context.activeOrg ?? null,
				),
			),
		proposeSignerReplacement: authenticatedProcedure
			.input(fileHandlers.zProposeSignerReplacementBody)
			.output(out.files.proposeSignerReplacement)
			.handler(({ context, input }) =>
				fileHandlers.filesProposeSignerReplacement(
					context.userWallet,
					input,
					context.activeOrg ?? null,
				),
			),
		executeSignerReplacement: authenticatedProcedure
			.input(fileHandlers.zExecuteSignerReplacementBody)
			.output(out.files.executeSignerReplacement)
			.handler(({ context, input }) =>
				fileHandlers.filesExecuteSignerReplacement(
					context.userWallet,
					input,
					context.activeOrg ?? null,
				),
			),
		cancelSignerReplacement: authenticatedProcedure
			.input(fileHandlers.zCancelSignerReplacementBody)
			.output(out.files.cancelSignerReplacement)
			.handler(({ context, input }) =>
				fileHandlers.filesCancelSignerReplacement(
					context.userWallet,
					input,
					context.activeOrg ?? null,
				),
			),
		recallEnvelope: authenticatedProcedure
			.input(fileHandlers.zRecallEnvelopeBody)
			.output(out.files.recallEnvelope)
			.handler(({ context, input }) =>
				fileHandlers.filesRecallEnvelope(
					context.userWallet,
					input,
					context.activeOrg ?? null,
				),
			),
		clearEnvelopeSignatures: authenticatedProcedure
			.input(fileHandlers.zClearEnvelopeSignaturesBody)
			.output(out.files.clearEnvelopeSignatures)
			.handler(({ context, input }) =>
				fileHandlers.filesClearEnvelopeSignatures(
					context.userWallet,
					input,
					context.activeOrg ?? null,
				),
			),
		remindSigners: authenticatedProcedure
			.input(fileHandlers.zRemindSignersBody)
			.output(out.files.remindSigners)
			.handler(({ context, input }) =>
				fileHandlers.filesRemindSigners(context.userWallet, input),
			),
		coldInvite: {
			inviteByToken: publicProcedure
				.input(z.object({ inviteToken: z.string().min(1) }))
				.output(out.files.coldInvite.inviteByToken)
				.handler(({ input }) =>
					fileHandlers.filesColdInviteByToken(input.inviteToken),
				),
			claim: authenticatedProcedure
				.input(
					z.object({
						inviteToken: z.string().min(8),
						body: zColdInviteClaimBody,
					}),
				)
				.output(out.files.coldInvite.claim)
				.handler(({ context, input }) =>
					fileHandlers.filesColdInviteClaim({
						userWallet: context.userWallet,
						inviteToken: input.inviteToken,
						body: input.body,
					}),
				),
			regenerate: authenticatedProcedure
				.input(
					z.object({
						pieceCid: z.string().min(1),
						body: zColdInviteRegenerateBody,
					}),
				)
				.output(out.files.coldInvite.regenerate)
				.handler(({ context, input }) =>
					fileHandlers.filesColdInviteRegenerate({
						userWallet: context.userWallet,
						pieceCid: input.pieceCid,
						body: input.body,
					}),
				),
		},
		piece: filesPieceRouter,
		comments: {
			list: authenticatedProcedure
				.input(z.object({ pieceCid: z.string().min(1) }))
				.output(out.files.comments.list)
				.handler(({ context, input }) =>
					fileHandlers.filesCommentsList(context.userWallet, input.pieceCid),
				),
			append: authenticatedProcedure
				.input(zFileCommentAppendBody)
				.output(out.files.comments.append)
				.handler(({ context, input }) =>
					fileHandlers.filesCommentsAppend(context.userWallet, input),
				),
		},
	},
	billing: {
		entitlements: authenticatedProcedure
			.output(out.billing.entitlements)
			.handler(({ context }) =>
				billingEntitlements(context.userWallet, context.activeOrg),
			),
		createCheckoutSession: authenticatedProcedure
			.input(
				z.object({
					planId: z.enum(["individual", "teams", "teams_pro"]),
					interval: z.enum(["monthly", "yearly"]).default("monthly"),
					returnUrl: z.url(),
				}),
			)
			.output(out.billing.createCheckoutSession)
			.handler(({ context, input }) =>
				billingCreateCheckoutSession({
					wallet: context.userWallet,
					planId: input.planId,
					interval: input.interval,
					returnUrl: input.returnUrl,
				}),
			),
		createPortalSession: authenticatedProcedure
			.output(out.billing.createPortalSession)
			.handler(({ context }) => billingCreatePortalSession(context.userWallet)),
		getOrgSummary: authenticatedProcedure
			.output(out.billing.getOrgSummary)
			.handler(({ context }) => billingGetOrgSummary(context.activeOrg)),
		getUserSummary: authenticatedProcedure
			.output(out.billing.getUserSummary)
			.handler(({ context }) => billingGetUserSummary(context.userWallet)),
		getWorkspaceBillingContext: authenticatedProcedure
			.output(out.billing.getWorkspaceBillingContext)
			.handler(({ context }) =>
				billingGetWorkspaceBillingContext(
					context.userWallet,
					context.activeOrg,
				),
			),
		getUpgradeOfferings: authenticatedProcedure
			.input(z.object({ reason: z.enum(UPGRADE_LIMIT_REASONS) }))
			.output(out.billing.getUpgradeOfferings)
			.handler(({ context, input }) =>
				billingGetUpgradeOfferings(
					context.userWallet,
					context.activeOrg,
					input.reason,
				),
			),
		previewMarketingCheckout: publicProcedure
			.input(
				z.object({
					email: z.email(),
					planId: z.enum(["individual", "teams", "teams_pro"]),
					interval: z.enum(["monthly", "yearly"]).default("monthly"),
					seatCount: z.number().int().min(1).optional(),
				}),
			)
			.output(out.billing.previewMarketingCheckout)
			.handler(({ input }) => billingPreviewMarketingCheckout(input)),
		createOrgCheckoutSession: authenticatedProcedure
			.input(
				z.object({
					planId: z.enum(["individual", "teams", "teams_pro"]),
					interval: z.enum(["monthly", "yearly"]).default("monthly"),
					seatCount: z.number().int().min(1),
					returnUrl: z.url(),
				}),
			)
			.output(out.billing.createCheckoutSession)
			.handler(({ context, input }) =>
				billingCreateOrgCheckoutSession({
					wallet: context.userWallet,
					activeOrg: context.activeOrg,
					planId: input.planId,
					interval: input.interval,
					seatCount: input.seatCount,
					returnUrl: input.returnUrl,
				}),
			),
		previewOrgSeatChange: authenticatedProcedure
			.input(z.object({ seatCount: z.number().int().min(1) }))
			.output(out.billing.previewOrgSeatChange)
			.handler(({ context, input }) =>
				billingPreviewOrgSeatChange({
					activeOrg: context.activeOrg,
					seatCount: input.seatCount,
				}),
			),
		updateOrgSeats: authenticatedProcedure
			.input(z.object({ seatCount: z.number().int().min(1) }))
			.output(out.billing.updateOrgSeats)
			.handler(({ context, input }) =>
				billingUpdateOrgSeats({
					activeOrg: context.activeOrg,
					seatCount: input.seatCount,
				}),
			),
		createOrgPortalSession: authenticatedProcedure
			.output(out.billing.createPortalSession)
			.handler(({ context }) =>
				billingCreateOrgPortalSession(context.activeOrg),
			),
		previewOrgPlanChange: authenticatedProcedure
			.input(z.object({ planId: z.enum(["teams", "teams_pro"]) }))
			.output(out.billing.previewOrgPlanChange)
			.handler(({ context, input }) =>
				billingPreviewOrgPlanChange({
					activeOrg: context.activeOrg,
					planId: input.planId,
				}),
			),
		changeOrgPlan: authenticatedProcedure
			.input(z.object({ planId: z.enum(["teams", "teams_pro"]) }))
			.output(out.billing.changeOrgPlan)
			.handler(({ context, input }) =>
				billingChangeOrgPlan({
					activeOrg: context.activeOrg,
					planId: input.planId,
				}),
			),
		requestCheckoutLink: publicProcedure
			.input(
				z.object({
					email: z.email(),
					planId: z.enum(CHECKOUT_PLAN_IDS),
					interval: z.enum(["monthly", "yearly"]).default("monthly"),
					seatCount: z.number().int().min(1).optional(),
				}),
			)
			.output(z.object({ ok: z.literal(true) }))
			.handler(({ input }) => billingRequestCheckoutLink(input)),
		resendSetupLink: publicProcedure
			.input(z.object({ email: z.email() }))
			.output(z.object({ ok: z.literal(true) }))
			.handler(({ input }) => billingResendSetupLink(input)),
	},
	archival: {
		products: publicProcedure
			.output(out.archival.products)
			.handler(() => archivalProducts()),
		purchase: authenticatedProcedure
			.input(
				z.object({
					productId: z.string().min(1),
					returnUrl: z.url(),
				}),
			)
			.output(out.archival.purchase)
			.handler(({ context, input }) =>
				archivalPurchase({
					wallet: context.userWallet,
					activeOrg: context.activeOrg,
					productId: input.productId,
					returnUrl: input.returnUrl,
				}),
			),
		status: authenticatedProcedure
			.output(out.archival.status)
			.handler(({ context }) => archivalStatus(context.activeOrg)),
	},
	metrics: {
		invitesSummary: authenticatedProcedure
			.input(
				z.object({
					senderWallet: z.string().optional(),
					from: z.iso.datetime().optional(),
					to: z.iso.datetime().optional(),
				}),
			)
			.output(out.metrics.invitesSummary)
			.handler(({ context, input }) =>
				metricsInvitesSummary({
					adminWallet: context.userWallet,
					senderWallet: input.senderWallet,
					from: input.from ? new Date(input.from) : undefined,
					to: input.to ? new Date(input.to) : undefined,
				}),
			),
		senderUsage: authenticatedProcedure
			.input(z.object({ wallet: z.string().min(1) }))
			.output(out.metrics.senderUsage)
			.handler(({ context, input }) =>
				metricsSenderUsage({
					adminWallet: context.userWallet,
					wallet: input.wallet,
				}),
			),
	},
	sharing: {
		emailInvites: authenticatedProcedure
			.output(out.sharing.emailInvites)
			.handler(({ context }) =>
				sharingHandlers.sharingEmailInvites(context.userWallet),
			),
		inviteById: publicProcedure
			.input(z.object({ id: z.string().min(1) }))
			.output(out.sharing.inviteById)
			.handler(({ input }) => sharingHandlers.sharingInviteById(input.id)),
		inviteClaim: authenticatedProcedure
			.input(z.object({ id: z.string().min(1) }))
			.output(out.sharing.inviteClaim)
			.handler(({ context, input }) =>
				sharingHandlers.sharingInviteClaim(context.userWallet, input.id),
			),
		requestInvite: authenticatedProcedure
			.input(zSharingRequestInviteBody)
			.output(out.sharing.requestInvite)
			.handler(({ context, input }) =>
				sharingHandlers.sharingRequestInvite(context.userWallet, input),
			),
	},
	orgs: {
		create: authenticatedProcedure
			.input(zOrgsCreateBody)
			.output(out.orgs.create)
			.handler(({ context, input }) =>
				orgsHandlers.orgsCreate(context.userWallet, input),
			),
		listMine: authenticatedProcedure
			.output(out.orgs.listMine)
			.handler(({ context }) => orgsHandlers.orgsListMine(context.userWallet)),
		get: authenticatedProcedure
			.input(z.object({ organizationId: z.uuid() }))
			.output(out.orgs.get)
			.handler(({ context, input }) => {
				if (!context.activeOrg) {
					throw new ORPCError("BAD_REQUEST", {
						message: "X-Org-Id header required",
					});
				}
				return orgsHandlers.orgsGet(
					context.userWallet,
					context.activeOrg,
					input.organizationId,
				);
			}),
		update: authenticatedProcedure
			.input(zOrgsUpdateBody)
			.output(out.orgs.update)
			.handler(({ context, input }) => {
				if (!context.activeOrg) {
					throw new ORPCError("BAD_REQUEST", {
						message: "X-Org-Id header required",
					});
				}
				return orgsHandlers.orgsUpdate(
					context.userWallet,
					context.activeOrg,
					input,
				);
			}),
		linkWallet: authenticatedProcedure
			.input(zOrgsLinkWalletBody)
			.output(out.orgs.linkWallet)
			.handler(({ context, input }) => {
				if (!context.activeOrg) {
					throw new ORPCError("BAD_REQUEST", {
						message: "X-Org-Id header required",
					});
				}
				return orgsHandlers.orgsLinkOrgWallet(
					context.userWallet,
					context.activeOrg,
					input,
				);
			}),
		unlinkWallet: authenticatedProcedure
			.input(zOrgsUnlinkWalletBody)
			.output(out.orgs.unlinkWallet)
			.handler(({ context, input }) => {
				if (!context.activeOrg) {
					throw new ORPCError("BAD_REQUEST", {
						message: "X-Org-Id header required",
					});
				}
				return orgsHandlers.orgsUnlinkOrgWallet(
					context.userWallet,
					context.activeOrg,
					input,
				);
			}),
		settlementFeatureAccess: {
			get: authenticatedProcedure
				.input(z.object({ organizationId: z.uuid() }))
				.output(out.platformAdmin.settlementAccessDecision)
				.handler(({ context, input }) =>
					settlementAccessGetForOrg(context.userWallet, input.organizationId),
				),
			submitRequest: authenticatedProcedure
				.input(
					z.object({
						organizationId: z.uuid(),
						acceptTerms: z.literal(true),
						sanctionsSelfCert: z.literal(true),
						useCase: z.string().min(10).max(2000),
						termsVersion: z.string().min(1),
					}),
				)
				.output(out.platformAdmin.settlementAccessDecision)
				.handler(({ context, input }) =>
					settlementAccessSubmitRequest(
						context.userWallet,
						input.organizationId,
						input,
					),
				),
		},
		members: {
			setRole: authenticatedProcedure
				.input(zOrgsMembersSetRoleBody)
				.output(out.orgs.member)
				.handler(({ context, input }) => {
					if (!context.activeOrg) {
						throw new ORPCError("BAD_REQUEST", {
							message: "X-Org-Id header required",
						});
					}
					return orgsHandlers.orgsMembersSetRole(
						context.userWallet,
						context.activeOrg,
						input,
					);
				}),
			remove: authenticatedProcedure
				.input(zOrgsMembersRemoveBody)
				.output(out.orgs.member)
				.handler(({ context, input }) => {
					if (!context.activeOrg) {
						throw new ORPCError("BAD_REQUEST", {
							message: "X-Org-Id header required",
						});
					}
					return orgsHandlers.orgsMembersRemove(
						context.userWallet,
						context.activeOrg,
						input,
					);
				}),
		},
		keys: {
			wrapForMine: authenticatedProcedure
				.input(z.object({ organizationId: z.uuid() }))
				.output(
					z.object({
						wrappedOmk: zHexString(),
						wrapKemCiphertext: zHexString(),
					}),
				)
				.handler(({ context, input }) =>
					orgsHandlers.orgsKeysMyWrapForOrganization(
						context.userWallet,
						input.organizationId,
					),
				),
			myWrap: authenticatedProcedure
				.output(
					z.object({
						wrappedOmk: zHexString(),
						wrapKemCiphertext: zHexString(),
					}),
				)
				.handler(({ context }) => {
					if (!context.activeOrg) {
						throw new ORPCError("BAD_REQUEST", {
							message: "X-Org-Id header required",
						});
					}
					return orgsHandlers.orgsKeysMyWrap(
						context.userWallet,
						context.activeOrg,
					);
				}),
			publishWrap: authenticatedProcedure
				.input(zOrgsKeysPublishWrapBody)
				.output(z.object({ ok: z.literal(true) }))
				.handler(({ context, input }) => {
					if (!context.activeOrg) {
						throw new ORPCError("BAD_REQUEST", {
							message: "X-Org-Id header required",
						});
					}
					return orgsHandlers.orgsKeysPublishWrap(
						context.userWallet,
						context.activeOrg,
						input,
					);
				}),
		},
		invites: {
			create: authenticatedProcedure
				.input(zOrgsInviteCreateBody)
				.output(out.orgs.inviteCreate)
				.handler(({ context, input }) => {
					if (!context.activeOrg) {
						throw new ORPCError("BAD_REQUEST", {
							message: "X-Org-Id header required",
						});
					}
					return orgsHandlers.orgsInvitesCreate(
						context.userWallet,
						context.activeOrg,
						input,
					);
				}),
			accept: authenticatedProcedure
				.input(z.object({ token: z.string().min(16) }))
				.output(z.object({ organizationId: z.uuid() }))
				.handler(({ context, input }) =>
					orgsHandlers.orgsInvitesAccept(context.userWallet, input),
				),
		},
		connections: {
			add: authenticatedProcedure
				.input(zOrgsConnectionAddBody)
				.output(out.orgs.connection)
				.handler(({ context, input }) => {
					if (!context.activeOrg) {
						throw new ORPCError("BAD_REQUEST", {
							message: "X-Org-Id header required",
						});
					}
					return orgsHandlers.orgsConnectionsAdd(
						context.userWallet,
						context.activeOrg,
						input,
					);
				}),
			list: authenticatedProcedure
				.output(out.orgs.connectionsList)
				.handler(({ context }) => {
					if (!context.activeOrg) {
						throw new ORPCError("BAD_REQUEST", {
							message: "X-Org-Id header required",
						});
					}
					return orgsHandlers.orgsConnectionsList(
						context.userWallet,
						context.activeOrg,
					);
				}),
			revoke: authenticatedProcedure
				.input(zOrgsConnectionRevokeBody)
				.output(out.orgs.connection)
				.handler(({ context, input }) => {
					if (!context.activeOrg) {
						throw new ORPCError("BAD_REQUEST", {
							message: "X-Org-Id header required",
						});
					}
					return orgsHandlers.orgsConnectionsRevoke(
						context.userWallet,
						context.activeOrg,
						input,
					);
				}),
		},
		templates: {
			create: authenticatedProcedure
				.input(zOrgsTemplateCreateBody)
				.output(out.orgs.template)
				.handler(({ context, input }) => {
					if (!context.activeOrg) {
						throw new ORPCError("BAD_REQUEST", {
							message: "X-Org-Id header required",
						});
					}
					return orgsHandlers.orgsTemplatesCreate(
						context.userWallet,
						context.activeOrg,
						input,
					);
				}),
			list: authenticatedProcedure
				.output(out.orgs.templatesList)
				.handler(({ context }) => {
					if (!context.activeOrg) {
						throw new ORPCError("BAD_REQUEST", {
							message: "X-Org-Id header required",
						});
					}
					return orgsHandlers.orgsTemplatesList(
						context.userWallet,
						context.activeOrg,
					);
				}),
			get: authenticatedProcedure
				.input(z.object({ templateId: z.uuid() }))
				.output(out.orgs.template)
				.handler(({ context, input }) => {
					if (!context.activeOrg) {
						throw new ORPCError("BAD_REQUEST", {
							message: "X-Org-Id header required",
						});
					}
					return orgsHandlers.orgsTemplatesGet(
						context.userWallet,
						context.activeOrg,
						input.templateId,
					);
				}),
			cloneToEnvelope: authenticatedProcedure
				.input(z.object({ templateId: z.uuid() }))
				.output(out.orgs.templatesClone)
				.handler(({ context, input }) => {
					if (!context.activeOrg) {
						throw new ORPCError("BAD_REQUEST", {
							message: "X-Org-Id header required",
						});
					}
					return orgsHandlers.orgsTemplatesCloneToEnvelope(
						context.userWallet,
						context.activeOrg,
						input.templateId,
					);
				}),
			delete: authenticatedProcedure
				.input(z.object({ templateId: z.uuid() }))
				.output(out.orgs.template)
				.handler(({ context, input }) => {
					if (!context.activeOrg) {
						throw new ORPCError("BAD_REQUEST", {
							message: "X-Org-Id header required",
						});
					}
					return orgsHandlers.orgsTemplatesDelete(
						context.userWallet,
						context.activeOrg,
						input.templateId,
					);
				}),
		},
	},
	users: {
		register: publicProcedure
			.input(zUserRegisterBody)
			.output(out.users.register)
			.handler(({ input }) => userHandlers.userRegister(input)),
		registrationSnapshot: publicProcedure
			.input(z.object({ walletAddress: z.string() }))
			.output(out.users.registrationSnapshot)
			.handler(({ input }) => userHandlers.userRegistrationSnapshot(input)),
		activation: {
			get: authenticatedProcedure
				.output(out.users.activationGet)
				.handler(({ context }) =>
					userHandlers.userActivationGet(context.userWallet),
				),
			mark: authenticatedProcedure
				.input(userHandlers.zUserActivationMarkBody)
				.output(out.users.activationMark)
				.handler(({ context, input }) =>
					userHandlers.userActivationMark(context.userWallet, input),
				),
		},
		eraseAccount: authenticatedProcedure
			.output(out.users.eraseAccount)
			.handler(({ context }) =>
				userHandlers.userEraseAccount(context.userWallet),
			),
		privacyState: authenticatedProcedure
			.output(out.users.privacyState)
			.handler(({ context }) =>
				userHandlers.userPrivacyState(context.userWallet),
			),
		privacyRequestCreate: authenticatedProcedure
			.input(
				z.object({
					type: z.enum(["export", "erasure"]),
					note: z.string().max(2000).optional(),
				}),
			)
			.output(out.users.privacyRequestCreate)
			.handler(({ context, input }) =>
				userHandlers.userPrivacyRequestCreate(context.userWallet, input),
			),
		privacyRequestList: authenticatedProcedure
			.output(out.users.privacyRequestList)
			.handler(({ context }) =>
				userHandlers.userPrivacyRequestList(context.userWallet),
			),
		privacyRequestTransition: authenticatedProcedure
			.input(
				z.object({
					requestId: z.uuid(),
					status: z.enum([
						"submitted",
						"in_review",
						"on_hold",
						"completed",
						"rejected",
					]),
					closureNote: z.string().max(2000).optional(),
					legalHoldReason: z.string().max(2000).optional(),
				}),
			)
			.output(out.users.privacyRequestTransition)
			.handler(({ context, input }) =>
				userHandlers.userPrivacyRequestTransition(context.userWallet, input),
			),
		setAnalyticsConsent: authenticatedProcedure
			.input(
				z.object({
					choice: z.enum(["granted", "denied", "withdrawn"]),
					policyVersion: z.string().min(1).max(64),
				}),
			)
			.output(out.users.setAnalyticsConsent)
			.handler(({ context, input }) =>
				userHandlers.userSetAnalyticsConsent(context.userWallet, input),
			),
		exportAccountData: authenticatedProcedure
			.output(out.users.exportAccountData)
			.handler(({ context }) =>
				userHandlers.userExportAccountData(context.userWallet),
			),
		profile: {
			me: authenticatedProcedure
				.output(out.users.profileMe)
				.handler(({ context }) =>
					userHandlers.userProfileMe(context.userWallet),
				),
			update: authenticatedProcedure
				.input(zUserProfilePutBody)
				.output(out.users.profileUpdate)
				.handler(({ context, input }) =>
					userHandlers.userProfileUpdate(context.userWallet, input),
				),
			prevalidate: authenticatedProcedure
				.input(
					z.object({
						email: z.string().optional(),
						username: z.string().optional(),
					}),
				)
				.output(out.users.profilePrevalidate)
				.handler(({ input }) => userHandlers.userProfilePrevalidate(input)),
			lookup: authenticatedProcedure
				.input(z.object({ query: z.string().min(1) }))
				.output(out.users.profileLookup)
				.handler(({ context, input }) =>
					userHandlers.userProfileLookup(context.userWallet, input.query),
				),
			syncThirdwebEmail: authenticatedProcedure
				.input(zUserSyncThirdwebEmailBody)
				.output(out.users.profileSyncThirdwebEmail)
				.handler(({ context, input }) =>
					userHandlers.userProfileSyncThirdwebEmail(context.userWallet, input),
				),
			setPrimaryEmail: authenticatedProcedure
				.input(zUserSetPrimaryEmailBody)
				.output(out.users.profileSetPrimaryEmail)
				.handler(({ context, input }) =>
					userHandlers.userProfileSetPrimaryEmail(context.userWallet, input),
				),
		},
		signatures: {
			create: authenticatedProcedure
				.input(zUserSignatureCreateBody)
				.output(out.users.signaturesCreate)
				.handler(({ context, input }) =>
					userHandlers.userSignatureCreate(context.userWallet, input),
				),
			list: authenticatedProcedure
				.output(out.users.signaturesList)
				.handler(({ context }) =>
					userHandlers.userSignaturesList(context.userWallet),
				),
			get: authenticatedProcedure
				.input(z.object({ id: z.uuid() }))
				.output(out.users.signaturesGet)
				.handler(({ context, input }) =>
					userHandlers.userSignatureGetById(context.userWallet, input.id),
				),
			setDefault: authenticatedProcedure
				.input(zUserSignatureSetDefaultBody)
				.output(out.users.signaturesSetDefault)
				.handler(({ context, input }) =>
					userHandlers.userSignatureSetDefault(context.userWallet, input),
				),
			delete: authenticatedProcedure
				.input(z.object({ id: z.uuid() }))
				.output(out.users.signaturesDelete)
				.handler(({ context, input }) =>
					userHandlers.userSignatureDelete(context.userWallet, input.id),
				),
		},
	},
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
