import { zHexString } from "@filosign/shared/zod";
import type { RouterClient } from "@orpc/server";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import {
	authLogout,
	authNonce,
	authRefresh,
	authVerify,
	zAuthVerifyBody,
} from "@/api/handlers/auth";
import { billingEntitlements } from "@/api/handlers/billing-handlers";
import * as fileHandlers from "@/api/handlers/files";
import {
	metricsInvitesSummary,
	metricsSenderUsage,
} from "@/api/handlers/metrics-handlers";
import * as orgsHandlers from "@/api/handlers/orgs";
import {
	settlementsConfirmSettlement,
	settlementsListByFile,
	settlementsTrySettle,
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
import { authenticatedProcedure, publicProcedure } from "./procedures";
import { rpcOut as out } from "./schemas";

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
			.output(out.auth.nonce)
			.handler(({ input, context }) => authNonce(input.address, context)),
		verify: publicProcedure
			.input(zAuthVerifyBody)
			.output(out.auth.verify)
			.handler(({ input, context }) => authVerify(input, context)),
		refresh: publicProcedure
			.output(out.auth.refresh)
			.handler(({ context }) => authRefresh(context)),
		logout: publicProcedure
			.output(out.auth.logout)
			.handler(({ context }) => authLogout(context)),
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
				.handler(({ context, input }) =>
					fileHandlers.pieceAck({
						userWallet: context.userWallet,
						pieceCid: input.pieceCid,
						body: input.body,
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
			s3Url: authenticatedProcedure
				.input(z.object({ pieceCid: z.string().min(1) }))
				.output(out.files.piece.s3Url)
				.handler(({ context, input }) =>
					fileHandlers.pieceS3Url(context.userWallet, input.pieceCid),
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
		receivedRequests: authenticatedProcedure
			.output(out.sharing.receivedRequests)
			.handler(({ context }) =>
				sharingHandlers.sharingReceivedRequests(context.userWallet),
			),
		sentRequests: authenticatedProcedure
			.output(out.sharing.sentRequests)
			.handler(({ context }) =>
				sharingHandlers.sharingSentRequests(context.userWallet),
			),
		emailInvites: authenticatedProcedure
			.output(out.sharing.emailInvites)
			.handler(({ context }) =>
				sharingHandlers.sharingEmailInvites(context.userWallet),
			),
		canSendTo: authenticatedProcedure
			.input(z.object({ recipient: z.string() }))
			.output(out.sharing.canSendTo)
			.handler(({ context, input }) =>
				sharingHandlers.sharingCanSendTo(
					context.userWallet,
					input.recipient,
					context.activeOrg ?? null,
				),
			),
		cancelRequest: authenticatedProcedure
			.input(z.object({ id: z.string().min(1) }))
			.output(out.sharing.cancelRequest)
			.handler(({ context, input }) =>
				sharingHandlers.sharingCancelRequest(context.userWallet, input.id),
			),
		rejectRequest: authenticatedProcedure
			.input(z.object({ id: z.string().min(1) }))
			.output(out.sharing.rejectRequest)
			.handler(({ context, input }) =>
				sharingHandlers.sharingRejectRequest(context.userWallet, input.id),
			),
		acceptRequest: authenticatedProcedure
			.output(out.sharing.acceptRequest)
			.handler(() => sharingHandlers.sharingAcceptRequestDenied()),
		approve: authenticatedProcedure
			.input(z.record(z.string(), unk))
			.output(out.sharing.approve)
			.handler(({ context, input }) =>
				sharingHandlers.sharingApprove(context.userWallet, input),
			),
		receivableFrom: authenticatedProcedure
			.output(out.sharing.receivableFrom)
			.handler(({ context }) =>
				sharingHandlers.sharingReceivableFrom(context.userWallet),
			),
		sendableTo: authenticatedProcedure
			.output(out.sharing.sendableTo)
			.handler(({ context }) =>
				sharingHandlers.sharingSendableTo(
					context.userWallet,
					context.activeOrg ?? null,
				),
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
		createRequest: authenticatedProcedure
			.input(z.record(z.string(), unk))
			.output(out.sharing.createRequest)
			.handler(({ context, input }) =>
				sharingHandlers.sharingCreateRequest(context.userWallet, input),
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
