import z from "zod";

export const rpcAttachmentsPacketAccessOutputSchema = z.object({
	packetId: z.string(),
	packetCid: z.string(),
	label: z.string().nullable(),
	releaseMode: z.enum(["review", "conditional"]),
	downloadUrl: z.url(),
	kemCiphertext: z.string().optional(),
	encryptedPacketDek: z.string().optional(),
	/** Email used when wrapping the packet DEK; required for decrypt info. */
	dekRecipientEmail: z.string().optional(),
});

export const rpcAttachmentsUploadStartOutputSchema = z.object({
	uploadUrl: z.url(),
	key: z.string(),
});

export const rpcAttachmentsLinkOnChainRuleOutputSchema = z.object({
	ok: z.literal(true),
});

export const rpcAttachmentsRegisterForFileOutputSchema = z.object({
	ok: z.literal(true),
});
