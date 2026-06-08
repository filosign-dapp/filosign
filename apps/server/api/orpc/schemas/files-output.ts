import { zPlacementManifest } from "@filosign/shared";
import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import { z } from "zod";
import { rpcEmptyOutputSchema, zDateWire } from "./rpc-wire";

export const rpcFilesUploadStartOutputSchema = z.object({
	uploadUrl: z.string(),
	key: z.string(),
});

export const rpcColdInviteEntitledPacketSchema = z.object({
	packetId: z.string(),
	label: z.string().nullable(),
	packetCid: z.string(),
	releaseMode: z.enum(["review", "conditional"]),
	wrappedPacketDek: zHexString(),
});

export const rpcColdInviteByTokenOutputSchema = z.object({
	pieceCid: z.string(),
	recipientEmails: z.array(z.string()),
	wrappedEncryptionKey: zHexString(),
	isSigner: z.boolean(),
	sender: z.string(),
	senderLabel: z.string(),
	placementManifest: zPlacementManifest,
	expiresAt: z.string().nullable(),
	downloadUrl: z.string(),
	entitledPackets: z.array(rpcColdInviteEntitledPacketSchema),
});

export const rpcColdInviteClaimOutputSchema = z.object({
	filePieceCid: z.string(),
	role: z.enum(["signer", "viewer"]),
});

export const rpcColdInviteRegenerateOutputSchema = z.object({
	inviteToken: z.string(),
	recipientEmails: z.array(z.string()),
	expiresAt: z.string(),
});

export const rpcFilesRemindSignersOutputSchema = z.object({
	remindedCount: z.number().int().min(0),
	skippedCount: z.number().int().min(0),
});

export const rpcFilesRegisterOutputSchema = rpcEmptyOutputSchema;

export const rpcFilesProposeSignerReplacementOutputSchema = z.object({
	txHash: zHexString(),
	pending: z.boolean(),
});

export const rpcFilesExecuteSignerReplacementOutputSchema = z.object({
	txHash: zHexString(),
});

export const rpcFilesCancelSignerReplacementOutputSchema = z.object({
	txHash: zHexString(),
});

export const rpcFilesRecallEnvelopeOutputSchema = z.object({
	txHash: zHexString(),
	revokedBeforeCompletedAt: z.string(),
	revokedBy: zEvmAddress(),
});

export const rpcFilesClearEnvelopeSignaturesOutputSchema = z.object({
	txHash: zHexString(),
	clearedBy: zEvmAddress(),
	clearedAt: z.string(),
});

export const rpcFileCommentRowSchema = z.object({
	id: z.uuid(),
	authorWallet: zEvmAddress(),
	ciphertext: zHexString(),
	createdAt: zDateWire,
});

export const rpcFilesCommentsListOutputSchema = z.object({
	comments: z.array(rpcFileCommentRowSchema),
});

export const rpcFilesCommentsAppendOutputSchema = z.object({
	comment: z.object({
		id: z.uuid(),
		createdAt: zDateWire,
	}),
});
