import {
	DEPLOYMENTS,
	zSettlementRuleCancelInput,
	zSettlementRuleUpdateInput,
} from "@filosign/shared";
import { zHexString } from "@filosign/shared/zod";
import type { RouterClient } from "@orpc/server";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import {
	billingChangeOrgPlan,
	billingCreateCheckoutSession,
	billingCreateOrgCheckoutSession,
	billingCreateOrgPortalSession,
	billingCreatePortalSession,
	billingEntitlements,
	billingGetOrgSummary,
	billingPreviewOrgPlanChange,
	billingPreviewOrgSeatChange,
	billingUpdateOrgSeats,
} from "@/api/handlers/billing-handlers";
import * as draftHandlers from "@/api/handlers/drafts";
import * as fileHandlers from "@/api/handlers/files";
import {
	metricsInvitesSummary,
	metricsSenderUsage,
} from "@/api/handlers/metrics-handlers";
import * as orgsHandlers from "@/api/handlers/orgs";
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
import { loadPlatformRuntime } from "@/lib/domains/runtime";
import { zIndexerTxBody } from "@/lib/platform/validation/tx-registration";
import {
	authenticatedProcedure,
	orgProcedure,
	publicProcedure,
} from "./procedures";
import { rpcOut as out } from "./schemas";

const platformRuntimeSchema = z.object({
	uptime: z.number(),
	chain: z.unknown(),
	chainKey: z.enum(["local", "testnet", "mainnet"]),
	deployment: z.enum(DEPLOYMENTS),
});

const unk = z.unknown();

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
		};
	}),
	drafts: {
		create: orgProcedure
			.input(z.record(z.string(), unk))
			.output(out.drafts.create)
			.handler(({ context, input }) =>
				draftHandlers.draftsCreate(
					context.userWallet,
					context.activeOrg,
					input,
				),
			),
		save: orgProcedure
			.input(z.record(z.string(), unk))
			.output(out.drafts.save)
			.handler(({ context, input }) =>
				draftHandlers.draftsSave(context.userWallet, context.activeOrg, input),
			),
		list: orgProcedure
			.output(out.drafts.list)
			.handler(({ context }) =>
				draftHandlers.draftsList(context.userWallet, context.activeOrg),
			),
		get: orgProcedure
			.input(z.object({ draftId: z.string().uuid() }))
			.output(out.drafts.get)
			.handler(({ context, input }) =>
				draftHandlers.draftsGet(
					context.userWallet,
					context.activeOrg,
					input.draftId,
				),
			),
		presignSnapshot: orgProcedure
			.input(z.object({ draftId: z.string().uuid() }))
			.output(out.drafts.presignSnapshot)
			.handler(({ context, input }) =>
				draftHandlers.draftsPresignSnapshot(
					context.userWallet,
					context.activeOrg,
					input.draftId,
				),
			),
		prepareSave: orgProcedure
			.input(z.record(z.string(), unk))
			.output(out.drafts.prepareSave)
			.handler(({ context, input }) =>
				draftHandlers.draftsPrepareSave(
					context.userWallet,
					context.activeOrg,
					input,
				),
			),
		presignDocuments: orgProcedure
			.input(z.record(z.string(), unk))
			.output(out.drafts.presignDocuments)
			.handler(({ context, input }) =>
				draftHandlers.draftsPresignDocuments(
					context.userWallet,
					context.activeOrg,
					input,
				),
			),
		shareExternal: orgProcedure
			.input(z.record(z.string(), unk))
			.output(out.drafts.shareExternal)
			.handler(({ context, input }) =>
				draftHandlers.draftsShareExternal(
					context.userWallet,
					context.activeOrg,
					input,
				),
			),
		listExternalShares: orgProcedure
			.input(z.object({ draftId: z.string().uuid() }))
			.output(out.drafts.listExternalShares)
			.handler(({ context, input }) =>
				draftHandlers.draftsListExternalShares(
					context.userWallet,
					context.activeOrg,
					input.draftId,
				),
			),
		revokeExternalShare: orgProcedure
			.input(z.record(z.string(), unk))
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
			.input(z.record(z.string(), unk))
			.output(out.drafts.markSent)
			.handler(({ context, input }) =>
				draftHandlers.draftsMarkSent(
					context.userWallet,
					context.activeOrg,
					input,
				),
			),
		archive: orgProcedure
			.input(z.object({ draftId: z.string().uuid() }))
			.output(out.drafts.archive)
			.handler(({ context, input }) =>
				draftHandlers.draftsArchive(
					context.userWallet,
					context.activeOrg,
					input,
				),
			),
		comments: {
			list: orgProcedure
				.input(z.object({ draftId: z.string().uuid() }))
				.output(out.drafts.commentsList)
				.handler(({ context, input }) =>
					draftHandlers.draftsCommentsList(
						context.userWallet,
						context.activeOrg,
						input.draftId,
					),
				),
			append: orgProcedure
				.input(z.record(z.string(), unk))
				.output(out.drafts.commentsAppend)
				.handler(({ context, input }) =>
					draftHandlers.draftsCommentsAppend(
						context.userWallet,
						context.activeOrg,
						input,
					),
				),
		},
	},
	settlements: {
		listByFile: authenticatedProcedure
			.input(z.object({ pieceCid: z.string().min(1) }))
			.output(out.settlements.listByFile)
			.handler(({ context, input }) =>
				settlementsListByFile(context.userWallet, input.pieceCid),
			),
		trySettle: authenticatedProcedure
			.input(z.object({ onChainRuleId: z.string().regex(/^\d+$/) }))
			.output(out.settlements.trySettle)
			.handler(({ context, input }) =>
				settlementsTrySettle(context.userWallet, {
					onChainRuleId: input.onChainRuleId,
				}),
			),
		confirmSettlement: authenticatedProcedure
			.input(
				z.object({
					onChainRuleId: z.string().regex(/^\d+$/),
					payoutTxHash: zHexString,
				}),
			)
			.output(out.settlements.confirmSettlement)
			.handler(({ context, input }) =>
				settlementsConfirmSettlement(context.userWallet, {
					onChainRuleId: input.onChainRuleId,
					payoutTxHash: input.payoutTxHash as `0x${string}`,
				}),
			),
		registerForFile: authenticatedProcedure
			.input(
				z.object({
					pieceCid: z.string().min(1),
					organizationId: z.string().uuid().optional(),
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
			.input(z.record(z.string(), unk))
			.output(out.files.register)
			.handler(({ context, input }) =>
				fileHandlers.filesRegister(
					context.userWallet,
					input,
					context.activeOrg ?? null,
				),
			),
		amendSigner: authenticatedProcedure
			.input(fileHandlers.zAmendSignerBody)
			.output(out.files.amendSigner)
			.handler(({ context, input }) =>
				fileHandlers.filesAmendSigner(context.userWallet, input),
			),
		list: {
			sent: authenticatedProcedure
				.output(out.files.list.sent)
				.handler(({ context }) =>
					fileHandlers.filesListSent(context.userWallet),
				),
			received: authenticatedProcedure
				.output(out.files.list.received)
				.handler(({ context }) =>
					fileHandlers.filesListReceived(context.userWallet),
				),
			org: authenticatedProcedure
				.output(out.files.list.org)
				.handler(({ context }) => {
					if (!context.activeOrg) {
						throw new ORPCError("BAD_REQUEST", {
							message: "X-Org-Id header required",
						});
					}
					return fileHandlers.filesListOrg(context.activeOrg.organizationId);
				}),
		},
		archival: {
			purchase: authenticatedProcedure
				.input(
					z.object({
						pieceCid: z.string().min(1),
						tier: z.enum(["1y", "5y", "10y"]),
					}),
				)
				.output(out.files.archival.purchase)
				.handler(({ context, input }) =>
					fileHandlers.filesArchivalPurchase(context.userWallet, input),
				),
			status: authenticatedProcedure
				.input(z.object({ pieceCid: z.string().min(1) }))
				.output(out.files.archival.status)
				.handler(({ context, input }) =>
					fileHandlers.filesArchivalStatus(context.userWallet, input),
				),
		},
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
						body: z.record(z.string(), unk),
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
						body: z.record(z.string(), unk),
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
		piece: {
			detail: authenticatedProcedure
				.input(z.object({ pieceCid: z.string().min(1) }))
				.output(out.files.piece.detail)
				.handler(({ context, input }) =>
					fileHandlers.pieceDetail(context.userWallet, input.pieceCid),
				),
			ack: authenticatedProcedure
				.input(
					z.object({
						pieceCid: z.string().min(1),
						body: z.record(z.string(), unk),
					}),
				)
				.output(out.files.piece.ack)
				.handler(({ context, input }) => {
					const h = context.hono.req;
					const ua = h.header("user-agent") ?? null;
					const fwd = h.header("x-forwarded-for");
					const requestIp = fwd?.split(",")[0]?.trim() ?? null;
					return fileHandlers.pieceAck({
						userWallet: context.userWallet,
						pieceCid: input.pieceCid,
						body: input.body,
						requestIp,
						requestUserAgent: ua,
					});
				}),
			recordView: authenticatedProcedure
				.input(
					z.object({
						pieceCid: z.string().min(1),
						body: z
							.object({
								source: z
									.enum(["sign_page", "file_viewer", "inbox"])
									.optional(),
							})
							.optional(),
					}),
				)
				.output(out.files.piece.recordView)
				.handler(({ context, input }) =>
					fileHandlers.pieceRecordView({
						userWallet: context.userWallet,
						pieceCid: input.pieceCid,
						body: input.body ?? {},
					}),
				),
			signDraftGet: authenticatedProcedure
				.input(z.object({ pieceCid: z.string().min(1) }))
				.output(out.files.piece.signDraftFieldIds)
				.handler(({ context, input }) =>
					fileHandlers.pieceSignDraftGet(context.userWallet, input.pieceCid),
				),
			signDraftPut: authenticatedProcedure
				.input(
					z.object({
						pieceCid: z.string().min(1),
						body: z.record(z.string(), unk),
					}),
				)
				.output(out.files.piece.signDraftFieldIds)
				.handler(({ context, input }) =>
					fileHandlers.pieceSignDraftPut({
						userWallet: context.userWallet,
						pieceCid: input.pieceCid,
						body: input.body,
					}),
				),
			downloadUrl: authenticatedProcedure
				.input(z.object({ pieceCid: z.string().min(1) }))
				.output(out.files.piece.downloadUrl)
				.handler(({ context, input }) =>
					fileHandlers.pieceDownloadUrl(context.userWallet, input.pieceCid),
				),
			complianceBundle: authenticatedProcedure
				.input(
					z.object({
						pieceCid: z.string().min(1),
						documentSha256: z.string().optional(),
					}),
				)
				.output(out.files.piece.complianceBundle)
				.handler(({ context, input }) => {
					const h = context.hono.req;
					const ua = h.header("user-agent") ?? null;
					const fwd = h.header("x-forwarded-for");
					const requestIp = fwd?.split(",")[0]?.trim() ?? null;
					return fileHandlers.pieceComplianceBundle({
						userWallet: context.userWallet,
						pieceCid: input.pieceCid,
						documentSha256: input.documentSha256,
						userAgent: ua,
						requestIp,
					});
				}),
			sign: authenticatedProcedure
				.input(
					z.object({
						pieceCid: z.string().min(1),
						body: z.record(z.string(), unk),
					}),
				)
				.output(out.files.piece.sign)
				.handler(({ context, input }) =>
					fileHandlers.pieceSign({
						userWallet: context.userWallet,
						pieceCid: input.pieceCid,
						body: input.body,
					}),
				),
		},
	},
	billing: {
		entitlements: authenticatedProcedure
			.output(out.billing.entitlements)
			.handler(({ context }) => billingEntitlements(context.userWallet)),
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
		createOrgCheckoutSession: authenticatedProcedure
			.input(
				z.object({
					planId: z.enum(["teams", "teams_pro"]),
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
	},
	metrics: {
		invitesSummary: authenticatedProcedure
			.input(
				z.object({
					senderWallet: z.string().optional(),
					from: z.string().datetime().optional(),
					to: z.string().datetime().optional(),
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
			.input(z.record(z.string(), unk))
			.output(out.sharing.requestInvite)
			.handler(({ context, input }) =>
				sharingHandlers.sharingRequestInvite(context.userWallet, input),
			),
	},
	orgs: {
		create: authenticatedProcedure
			.input(z.record(z.string(), unk))
			.output(out.orgs.create)
			.handler(({ context, input }) =>
				orgsHandlers.orgsCreate(context.userWallet, input),
			),
		listMine: authenticatedProcedure
			.output(out.orgs.listMine)
			.handler(({ context }) => orgsHandlers.orgsListMine(context.userWallet)),
		get: authenticatedProcedure
			.input(z.object({ organizationId: z.string().uuid() }))
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
			.input(z.record(z.string(), unk))
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
		members: {
			setRole: authenticatedProcedure
				.input(z.record(z.string(), unk))
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
				.input(z.record(z.string(), unk))
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
				.input(z.object({ organizationId: z.string().uuid() }))
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
				.input(z.record(z.string(), unk))
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
				.input(z.record(z.string(), unk))
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
				.output(z.object({ organizationId: z.string().uuid() }))
				.handler(({ context, input }) =>
					orgsHandlers.orgsInvitesAccept(context.userWallet, input),
				),
		},
		connections: {
			add: authenticatedProcedure
				.input(z.record(z.string(), unk))
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
				.input(z.record(z.string(), unk))
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
				.input(z.record(z.string(), unk))
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
				.input(z.object({ templateId: z.string().uuid() }))
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
				.input(z.object({ templateId: z.string().uuid() }))
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
		},
	},
	users: {
		register: publicProcedure
			.input(z.record(z.string(), unk))
			.output(out.users.register)
			.handler(({ input }) => userHandlers.userRegister(input)),
		registrationSnapshot: publicProcedure
			.input(z.object({ walletAddress: z.string() }))
			.output(out.users.registrationSnapshot)
			.handler(({ input }) => userHandlers.userRegistrationSnapshot(input)),
		profile: {
			me: authenticatedProcedure
				.output(out.users.profileMe)
				.handler(({ context }) =>
					userHandlers.userProfileMe(context.userWallet),
				),
			update: authenticatedProcedure
				.input(z.record(z.string(), unk))
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
				.input(z.record(z.string(), unk))
				.output(out.users.profileSyncPrivyEmail)
				.handler(({ context, input }) =>
					userHandlers.userProfileSyncPrivyEmail(context.userWallet, input),
				),
			setPrimaryEmail: authenticatedProcedure
				.input(z.record(z.string(), unk))
				.output(out.users.profileSetPrimaryEmail)
				.handler(({ context, input }) =>
					userHandlers.userProfileSetPrimaryEmail(context.userWallet, input),
				),
		},
		signatures: {
			create: authenticatedProcedure
				.input(z.record(z.string(), unk))
				.output(out.users.signaturesCreate)
				.handler(({ context, input }) =>
					userHandlers.userSignaturesCreate(context.userWallet, input),
				),
			list: authenticatedProcedure
				.output(out.users.signaturesList)
				.handler(({ context }) =>
					userHandlers.userSignaturesList(context.userWallet),
				),
			get: authenticatedProcedure
				.input(z.object({ id: z.string().min(1) }))
				.output(out.users.signaturesGet)
				.handler(({ context, input }) =>
					userHandlers.userSignaturesGetById(context.userWallet, input.id),
				),
		},
	},
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
