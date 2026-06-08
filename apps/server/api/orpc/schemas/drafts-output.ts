import { zHexString } from "@filosign/shared/zod";
import { z } from "zod";
import { zDateWire } from "./rpc-wire";

const zDraftStatus = z.enum(["active", "archived", "sent"]);
const zDraftAccessKind = z.enum(["warm", "cold"]);

export const rpcDraftSummarySchema = z.object({
	id: z.uuid(),
	organizationId: z.uuid(),
	title: z.string(),
	status: zDraftStatus,
	revision: z.number().int(),
	createdByWallet: z.string(),
	createdAt: zDateWire,
	updatedAt: zDateWire,
	sentPieceCid: z.string().nullable().optional(),
});

export const rpcDraftsCreateOutputSchema = z.object({
	draft: rpcDraftSummarySchema,
	snapshot: z.object({
		s3Key: z.string(),
		uploadUrl: z.string(),
	}),
});

export const rpcDraftsSaveOutputSchema = z.object({
	revision: z.number().int(),
});

export const rpcDraftsListOutputSchema = z.object({
	drafts: z.array(rpcDraftSummarySchema),
});

export const rpcDraftDocumentDownloadSchema = z.object({
	docId: z.string(),
	s3Key: z.string(),
	name: z.string(),
	size: z.number().int().optional(),
	mimeType: z.string(),
	downloadUrl: z.string(),
});

export const rpcDraftsGetOutputSchema = z.object({
	draft: rpcDraftSummarySchema,
	headDekWrappedOmk: zHexString().nullable().optional(),
	headOmkKemCiphertext: zHexString().nullable().optional(),
	snapshot: z.object({
		s3Key: z.string(),
		downloadUrl: z.string(),
	}),
	documents: z.array(rpcDraftDocumentDownloadSchema),
});

export const rpcDraftsPrepareSaveOutputSchema = z.object({
	snapshot: z.object({
		s3Key: z.string(),
		needsUpload: z.boolean(),
		uploadUrl: z.string().optional(),
	}),
	documents: z.array(
		z.object({
			docId: z.string(),
			s3Key: z.string(),
			needsUpload: z.boolean(),
			uploadUrl: z.string().optional(),
		}),
	),
});

export const rpcDraftsPresignSnapshotOutputSchema = z.object({
	s3Key: z.string(),
	uploadUrl: z.string(),
});

export const rpcDraftsPresignDocumentsOutputSchema = z.object({
	uploads: z.array(
		z.object({
			docId: z.string(),
			s3Key: z.string(),
			uploadUrl: z.string(),
		}),
	),
});

export const rpcDraftsShareExternalOutputSchema = z.object({
	shares: z.array(
		z.object({
			shareId: z.uuid(),
			email: z.string(),
			accessKind: zDraftAccessKind,
			inviteToken: z.string(),
		}),
	),
});

export const rpcDraftsExternalShareRowSchema = z.object({
	id: z.uuid(),
	email: z.string(),
	accessKind: zDraftAccessKind,
	inviteToken: z.string(),
	recipientWallet: z.string().nullable().optional(),
	expiresAt: zDateWire.nullable(),
	revokedAt: zDateWire.nullable(),
	createdAt: zDateWire,
});

export const rpcDraftsListExternalSharesOutputSchema = z.object({
	shares: z.array(rpcDraftsExternalShareRowSchema),
});

export const rpcDraftsRevokeExternalShareOutputSchema = z.object({
	ok: z.literal(true),
});

export const rpcDraftsReviewByTokenColdOutputSchema = z.object({
	accessKind: z.literal("cold"),
	draftId: z.uuid(),
	title: z.string(),
	email: z.string(),
	wrappedDek: z.string(),
	expiresAt: z.string().nullable(),
	snapshotDownloadUrl: z.string(),
	documents: z.array(
		z.object({
			docId: z.string(),
			s3Key: z.string(),
			name: z.string(),
			mimeType: z.string(),
			downloadUrl: z.string(),
		}),
	),
});

export const rpcDraftsReviewByTokenWarmOutputSchema = z.object({
	accessKind: z.literal("warm"),
	draftId: z.uuid(),
	title: z.string(),
	email: z.string(),
	expiresAt: z.string().nullable(),
});

export const rpcDraftsReviewByTokenOutputSchema = z.union([
	rpcDraftsReviewByTokenColdOutputSchema,
	rpcDraftsReviewByTokenWarmOutputSchema,
]);

export const rpcDraftsReviewForWalletOutputSchema = z.object({
	draftId: z.uuid(),
	title: z.string(),
	email: z.string(),
	kemCiphertext: zHexString(),
	encryptedDek: zHexString(),
	snapshotDownloadUrl: z.string(),
	documents: z.array(
		z.object({
			docId: z.string(),
			s3Key: z.string(),
			name: z.string(),
			mimeType: z.string(),
			downloadUrl: z.string(),
		}),
	),
});

export const rpcDraftsMarkSentOutputSchema = z.object({
	ok: z.literal(true),
});

export const rpcDraftsArchiveOutputSchema = z.object({
	ok: z.literal(true),
});

export const rpcDraftCommentSchema = z.object({
	id: z.uuid(),
	authorWallet: z.string().nullable().optional(),
	authorDisplayName: z.string().optional(),
	authorEmail: z.string().optional(),
	inviteToken: z.string().nullable().optional(),
	ciphertext: zHexString(),
	createdAt: zDateWire,
});

export const rpcDraftsCommentsListOutputSchema = z.object({
	comments: z.array(rpcDraftCommentSchema),
});

export const rpcDraftsCommentsAppendOutputSchema = z.object({
	comment: z.object({
		id: z.uuid(),
		createdAt: zDateWire,
	}),
});

export const rpcDraftsCommentsUpdateOutputSchema = z.object({
	comment: z.object({
		id: z.uuid(),
	}),
});

export const rpcDraftsCommentsDeleteOutputSchema = z.object({
	deleted: z.literal(true),
});
