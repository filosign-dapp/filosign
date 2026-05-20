import { zHexString } from "@filosign/shared/zod";
import type { RouterClient } from "@orpc/server";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { authNonce, authVerify, zAuthVerifyBody } from "@/api/handlers/auth";
import { billingEntitlements } from "@/api/handlers/billing-handlers";
import {
	filesColdInviteByToken,
	filesColdInviteClaim,
	filesColdInviteRegenerate,
} from "@/api/handlers/files-cold-invite";
import {
	filesListOrg,
	filesListReceived,
	filesListSent,
	filesUploadStart,
	zUploadStartBody,
} from "@/api/handlers/files-list-upload";
import * as pieceHandlers from "@/api/handlers/files-piece";
import { filesRegister } from "@/api/handlers/files-register";
import {
	metricsInvitesSummary,
	metricsSenderUsage,
} from "@/api/handlers/metrics-handlers";
import * as orgsHandlers from "@/api/handlers/orgs-handlers";
import * as sharingHandlers from "@/api/handlers/sharing-handlers";
import {
	storagePresignPut,
	zStoragePresignPutInput,
} from "@/api/handlers/storage-handlers";
import { txProcessIndexerHash } from "@/api/handlers/tx";
import * as userHandlers from "@/api/handlers/users-handlers";
import { loadPlatformRuntime } from "@/lib/domain/platform-runtime";
import { zIndexerTxBody } from "@/lib/validation/tx-registration";
import { authenticatedProcedure, publicProcedure } from "./procedures";
import {
	rpcAuthNonceOutputSchema,
	rpcAuthVerifyOutputSchema,
	rpcBillingEntitlementsOutputSchema,
	rpcColdInviteByTokenOutputSchema,
	rpcColdInviteClaimOutputSchema,
	rpcColdInviteRegenerateOutputSchema,
	rpcFilesListReceivedOutputSchema,
	rpcFilesListSentOutputSchema,
	rpcFilesRegisterOutputSchema,
	rpcFilesUploadStartOutputSchema,
	rpcMetricsInvitesSummaryOutputSchema,
	rpcMetricsSenderUsageOutputSchema,
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
	rpcPieceAckOutputSchema,
	rpcPieceComplianceBundleOutputSchema,
	rpcPieceDetailOutputSchema,
	rpcPieceS3UrlOutputSchema,
	rpcPieceSignDraftFieldIdsOutputSchema,
	rpcPieceSignOutputSchema,
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
	rpcStoragePresignPutOutputSchema,
	rpcTxProcessIndexerHashOutputSchema,
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
} from "./schemas/index";

const platformRuntimeSchema = z.object({
	uptime: z.number(),
	serverAddressSynapse: z.string(),
	chain: z.unknown(),
	chainKey: z.enum(["local", "testnet", "mainnet"]),
	treasury: z.string(),
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
			serverAddressSynapse: r.serverAddressSynapse,
			chain: r.chain,
			chainKey: r.chainKey,
			treasury: r.treasury,
		};
	}),
	auth: {
		nonce: publicProcedure
			.input(z.object({ address: z.string() }))
			.output(rpcAuthNonceOutputSchema)
			.handler(({ input }) => authNonce(input.address)),
		verify: publicProcedure
			.input(zAuthVerifyBody)
			.output(rpcAuthVerifyOutputSchema)
			.handler(({ input }) => authVerify(input)),
	},
	tx: {
		processIndexerHash: authenticatedProcedure
			.input(
				z.object({
					hash: z.string(),
					body: zIndexerTxBody.optional(),
				}),
			)
			.output(rpcTxProcessIndexerHashOutputSchema)
			.handler(({ input }) =>
				txProcessIndexerHash({ hash: input.hash }, input.body ?? {}),
			),
	},
	storage: {
		presignPut: authenticatedProcedure
			.input(zStoragePresignPutInput)
			.output(rpcStoragePresignPutOutputSchema)
			.handler(({ context, input }) =>
				storagePresignPut(context.userWallet, input),
			),
	},
	files: {
		uploadStart: authenticatedProcedure
			.input(zUploadStartBody)
			.output(rpcFilesUploadStartOutputSchema)
			.handler(({ context, input }) =>
				filesUploadStart(context.userWallet, input),
			),
		register: authenticatedProcedure
			.input(z.record(z.string(), unk))
			.output(rpcFilesRegisterOutputSchema)
			.handler(({ context, input }) =>
				filesRegister(context.userWallet, input, context.activeOrg ?? null),
			),
		list: {
			sent: authenticatedProcedure
				.output(rpcFilesListSentOutputSchema)
				.handler(({ context }) => filesListSent(context.userWallet)),
			received: authenticatedProcedure
				.output(rpcFilesListReceivedOutputSchema)
				.handler(({ context }) => filesListReceived(context.userWallet)),
			org: authenticatedProcedure
				.output(rpcFilesListSentOutputSchema)
				.handler(({ context }) => {
					if (!context.activeOrg) {
						throw new ORPCError("BAD_REQUEST", {
							message: "X-Org-Id header required",
						});
					}
					return filesListOrg(context.activeOrg.organizationId);
				}),
		},
		coldInvite: {
			inviteByToken: publicProcedure
				.input(z.object({ inviteToken: z.string().min(1) }))
				.output(rpcColdInviteByTokenOutputSchema)
				.handler(({ input }) => filesColdInviteByToken(input.inviteToken)),
			claim: authenticatedProcedure
				.input(
					z.object({
						inviteToken: z.string().min(8),
						body: z.record(z.string(), unk),
					}),
				)
				.output(rpcColdInviteClaimOutputSchema)
				.handler(({ context, input }) =>
					filesColdInviteClaim({
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
				.output(rpcColdInviteRegenerateOutputSchema)
				.handler(({ context, input }) =>
					filesColdInviteRegenerate({
						userWallet: context.userWallet,
						pieceCid: input.pieceCid,
						body: input.body,
					}),
				),
		},
		piece: {
			detail: authenticatedProcedure
				.input(z.object({ pieceCid: z.string().min(1) }))
				.output(rpcPieceDetailOutputSchema)
				.handler(({ context, input }) =>
					pieceHandlers.pieceDetail(context.userWallet, input.pieceCid),
				),
			ack: authenticatedProcedure
				.input(
					z.object({
						pieceCid: z.string().min(1),
						body: z.record(z.string(), unk),
					}),
				)
				.output(rpcPieceAckOutputSchema)
				.handler(({ context, input }) =>
					pieceHandlers.pieceAck({
						userWallet: context.userWallet,
						pieceCid: input.pieceCid,
						body: input.body,
					}),
				),
			signDraftGet: authenticatedProcedure
				.input(z.object({ pieceCid: z.string().min(1) }))
				.output(rpcPieceSignDraftFieldIdsOutputSchema)
				.handler(({ context, input }) =>
					pieceHandlers.pieceSignDraftGet(context.userWallet, input.pieceCid),
				),
			signDraftPut: authenticatedProcedure
				.input(
					z.object({
						pieceCid: z.string().min(1),
						body: z.record(z.string(), unk),
					}),
				)
				.output(rpcPieceSignDraftFieldIdsOutputSchema)
				.handler(({ context, input }) =>
					pieceHandlers.pieceSignDraftPut({
						userWallet: context.userWallet,
						pieceCid: input.pieceCid,
						body: input.body,
					}),
				),
			s3Url: authenticatedProcedure
				.input(z.object({ pieceCid: z.string().min(1) }))
				.output(rpcPieceS3UrlOutputSchema)
				.handler(({ context, input }) =>
					pieceHandlers.pieceS3Url(context.userWallet, input.pieceCid),
				),
			complianceBundle: authenticatedProcedure
				.input(
					z.object({
						pieceCid: z.string().min(1),
						documentSha256: z.string().optional(),
					}),
				)
				.output(rpcPieceComplianceBundleOutputSchema)
				.handler(({ context, input }) => {
					const h = context.hono.req;
					const ua = h.header("user-agent") ?? null;
					const fwd = h.header("x-forwarded-for");
					const requestIp = fwd?.split(",")[0]?.trim() ?? null;
					return pieceHandlers.pieceComplianceBundle({
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
				.output(rpcPieceSignOutputSchema)
				.handler(({ context, input }) =>
					pieceHandlers.pieceSign({
						userWallet: context.userWallet,
						pieceCid: input.pieceCid,
						body: input.body,
					}),
				),
		},
	},
	billing: {
		entitlements: authenticatedProcedure
			.output(rpcBillingEntitlementsOutputSchema)
			.handler(({ context }) => billingEntitlements(context.userWallet)),
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
			.output(rpcMetricsInvitesSummaryOutputSchema)
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
			.output(rpcMetricsSenderUsageOutputSchema)
			.handler(({ context, input }) =>
				metricsSenderUsage({
					adminWallet: context.userWallet,
					wallet: input.wallet,
				}),
			),
	},
	sharing: {
		receivedRequests: authenticatedProcedure
			.output(rpcSharingReceivedRequestsOutputSchema)
			.handler(({ context }) =>
				sharingHandlers.sharingReceivedRequests(context.userWallet),
			),
		sentRequests: authenticatedProcedure
			.output(rpcSharingSentRequestsOutputSchema)
			.handler(({ context }) =>
				sharingHandlers.sharingSentRequests(context.userWallet),
			),
		emailInvites: authenticatedProcedure
			.output(rpcSharingEmailInvitesOutputSchema)
			.handler(({ context }) =>
				sharingHandlers.sharingEmailInvites(context.userWallet),
			),
		canSendTo: authenticatedProcedure
			.input(z.object({ recipient: z.string() }))
			.output(rpcSharingCanSendToOutputSchema)
			.handler(({ context, input }) =>
				sharingHandlers.sharingCanSendTo(
					context.userWallet,
					input.recipient,
					context.activeOrg ?? null,
				),
			),
		cancelRequest: authenticatedProcedure
			.input(z.object({ id: z.string().min(1) }))
			.output(rpcSharingCancelRequestOutputSchema)
			.handler(({ context, input }) =>
				sharingHandlers.sharingCancelRequest(context.userWallet, input.id),
			),
		rejectRequest: authenticatedProcedure
			.input(z.object({ id: z.string().min(1) }))
			.output(rpcSharingRejectRequestOutputSchema)
			.handler(({ context, input }) =>
				sharingHandlers.sharingRejectRequest(context.userWallet, input.id),
			),
		acceptRequest: authenticatedProcedure
			.output(rpcSharingAcceptRequestOutputSchema)
			.handler(() => sharingHandlers.sharingAcceptRequestDenied()),
		approve: authenticatedProcedure
			.input(z.record(z.string(), unk))
			.output(rpcSharingApproveOutputSchema)
			.handler(({ context, input }) =>
				sharingHandlers.sharingApprove(context.userWallet, input),
			),
		receivableFrom: authenticatedProcedure
			.output(rpcSharingReceivableFromOutputSchema)
			.handler(({ context }) =>
				sharingHandlers.sharingReceivableFrom(context.userWallet),
			),
		sendableTo: authenticatedProcedure
			.output(rpcSharingSendableToOutputSchema)
			.handler(({ context }) =>
				sharingHandlers.sharingSendableTo(
					context.userWallet,
					context.activeOrg ?? null,
				),
			),
		inviteById: publicProcedure
			.input(z.object({ id: z.string().min(1) }))
			.output(rpcSharingInviteByIdOutputSchema)
			.handler(({ input }) => sharingHandlers.sharingInviteById(input.id)),
		inviteClaim: authenticatedProcedure
			.input(z.object({ id: z.string().min(1) }))
			.output(rpcSharingInviteClaimOutputSchema)
			.handler(({ context, input }) =>
				sharingHandlers.sharingInviteClaim(context.userWallet, input.id),
			),
		createRequest: authenticatedProcedure
			.input(z.record(z.string(), unk))
			.output(rpcSharingCreateRequestOutputSchema)
			.handler(({ context, input }) =>
				sharingHandlers.sharingCreateRequest(context.userWallet, input),
			),
		requestInvite: authenticatedProcedure
			.input(z.record(z.string(), unk))
			.output(rpcSharingRequestInviteOutputSchema)
			.handler(({ context, input }) =>
				sharingHandlers.sharingRequestInvite(context.userWallet, input),
			),
	},
	orgs: {
		create: authenticatedProcedure
			.input(z.record(z.string(), unk))
			.output(rpcOrgsCreateOutputSchema)
			.handler(({ context, input }) =>
				orgsHandlers.orgsCreate(context.userWallet, input),
			),
		listMine: authenticatedProcedure
			.output(rpcOrgsListMineOutputSchema)
			.handler(({ context }) => orgsHandlers.orgsListMine(context.userWallet)),
		get: authenticatedProcedure
			.input(z.object({ organizationId: z.string().uuid() }))
			.output(rpcOrgsGetOutputSchema)
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
			.output(rpcOrgsUpdateOutputSchema)
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
				.output(rpcOrgsMemberOutputSchema)
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
				.output(rpcOrgsMemberOutputSchema)
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
				.output(rpcOrgsInviteCreateOutputSchema)
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
				.output(rpcOrgsConnectionOutputSchema)
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
				.output(rpcOrgsConnectionsListOutputSchema)
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
				.output(rpcOrgsConnectionOutputSchema)
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
				.output(rpcOrgsTemplateOutputSchema)
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
				.output(rpcOrgsTemplatesListOutputSchema)
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
				.output(rpcOrgsTemplateOutputSchema)
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
				.output(rpcOrgsTemplatesCloneOutputSchema)
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
			.output(rpcUserRegisterOutputSchema)
			.handler(({ input }) => userHandlers.userRegister(input)),
		profile: {
			me: authenticatedProcedure
				.output(rpcUserProfileMeOutputSchema)
				.handler(({ context }) =>
					userHandlers.userProfileMe(context.userWallet),
				),
			update: authenticatedProcedure
				.input(z.record(z.string(), unk))
				.output(rpcUserProfileUpdateOutputSchema)
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
				.output(rpcUserProfilePrevalidateOutputSchema)
				.handler(({ input }) => userHandlers.userProfilePrevalidate(input)),
			lookup: authenticatedProcedure
				.input(z.object({ query: z.string().min(1) }))
				.output(rpcUserProfileLookupOutputSchema)
				.handler(({ context, input }) =>
					userHandlers.userProfileLookup(context.userWallet, input.query),
				),
			syncPrivyEmail: authenticatedProcedure
				.input(z.record(z.string(), unk))
				.output(rpcUserProfileSyncPrivyEmailOutputSchema)
				.handler(({ context, input }) =>
					userHandlers.userProfileSyncPrivyEmail(context.userWallet, input),
				),
			setPrimaryEmail: authenticatedProcedure
				.input(z.record(z.string(), unk))
				.output(rpcUserProfileSetPrimaryEmailOutputSchema)
				.handler(({ context, input }) =>
					userHandlers.userProfileSetPrimaryEmail(context.userWallet, input),
				),
		},
		signatures: {
			create: authenticatedProcedure
				.input(z.record(z.string(), unk))
				.output(rpcUserSignaturesCreateOutputSchema)
				.handler(({ context, input }) =>
					userHandlers.userSignaturesCreate(context.userWallet, input),
				),
			list: authenticatedProcedure
				.output(rpcUserSignaturesListOutputSchema)
				.handler(({ context }) =>
					userHandlers.userSignaturesList(context.userWallet),
				),
			get: authenticatedProcedure
				.input(z.object({ id: z.string().min(1) }))
				.output(rpcUserSignaturesGetOutputSchema)
				.handler(({ context, input }) =>
					userHandlers.userSignaturesGetById(context.userWallet, input.id),
				),
		},
	},
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
