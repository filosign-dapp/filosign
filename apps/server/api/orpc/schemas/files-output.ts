import { zHexString } from "@filosign/shared/zod";
import { z } from "zod";
import { rpcEmptyOutputSchema } from "./rpc-wire";

export const rpcFilesUploadStartOutputSchema = z.object({
	uploadUrl: z.string(),
	key: z.string(),
});

const rpcFileListDisplaySchema = z.object({
	displayName: z.string().nullable(),
	mimeType: z.string().nullable(),
	ciphertextByteLength: z.number().int().nullable(),
	createdAt: z.coerce.date().optional(),
});

const rpcFileRowSentSchema = rpcFileListDisplaySchema.extend({
	pieceCid: z.string(),
	sender: z.string(),
	status: z.literal("s3"),
});

export const rpcFilesListSentOutputSchema = z.object({
	files: z.array(rpcFileRowSentSchema),
});

const inboxEntrySchema = rpcFileRowSentSchema.extend({
	encryptedEncryptionKey: zHexString(),
	kemCiphertext: zHexString(),
	signedByMe: z.boolean(),
});

export const rpcFilesListReceivedOutputSchema = z.object({
	files: z.array(inboxEntrySchema),
});

export const rpcColdInviteByTokenOutputSchema = z.object({
	pieceCid: z.string(),
	recipientEmails: z.array(z.string()),
	wrappedEncryptionKey: zHexString(),
	isSigner: z.boolean(),
	sender: z.string(),
	senderLabel: z.string(),
	placementManifest: z.unknown(),
	expiresAt: z.string().nullable(),
	downloadUrl: z.string(),
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

export const rpcFilesRegisterOutputSchema = rpcEmptyOutputSchema;
