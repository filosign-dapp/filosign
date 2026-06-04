import { z } from "zod";
import * as fileHandlers from "@/api/handlers/files";
import { authenticatedProcedure } from "@/api/orpc/procedures";
import { rpcOut as out } from "@/api/orpc/schemas";
import { zPieceSignDraftPutBody } from "@/lib/domains/files/draft";
import { zPieceAckBody } from "@/lib/domains/files/piece";
import { zPieceSignBody } from "@/lib/domains/files/sign";

/** `files.piece` procedures (extracted from main router). */
export const filesPieceRouter = {
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
				body: zPieceAckBody,
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
						source: z.enum(["sign_page", "file_viewer", "inbox"]).optional(),
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
				body: zPieceSignDraftPutBody,
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
				exportKind: z.enum(["zip", "pdf", "json"]).default("pdf"),
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
				exportKind: input.exportKind,
				documentSha256: input.documentSha256,
				userAgent: ua,
				requestIp,
			});
		}),
	sign: authenticatedProcedure
		.input(
			z.object({
				pieceCid: z.string().min(1),
				body: zPieceSignBody,
			}),
		)
		.output(out.files.piece.sign)
		.handler(({ context, input }) => {
			const requestIp =
				context.hono.req.header("x-forwarded-for") ||
				context.hono.req.header("x-real-ip") ||
				null;
			const requestUserAgent = context.hono.req.header("user-agent") || null;
			return fileHandlers.pieceSign({
				userWallet: context.userWallet,
				pieceCid: input.pieceCid,
				body: input.body,
				requestIp,
				requestUserAgent,
			});
		}),
};
