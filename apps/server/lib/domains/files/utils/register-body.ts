import {
	zAttachmentPacketSendInput,
	zEnvelopeMetadata,
	zPlacementManifest,
	zRegisterRoutingInput,
} from "@filosign/shared";
import { zEvmAddress, zHexString } from "@filosign/shared/zod";
import z from "zod";

export const zFileRegisterBody = z.object({
	pieceCid: z.string({ error: "pieceCid invalid" }),
	participants: z.array(
		z.object({
			address: zEvmAddress(),
			kemCiphertext: zHexString(),
			encryptedEncryptionKey: zHexString(),
			isSigner: z
				.boolean({
					error: "participants[n].isSigner must be boolean",
				})
				.optional(),
		}),
	),
	signature: zHexString(),
	senderEncryptedEncryptionKey: zHexString(),
	senderKemCiphertext: zHexString(),
	timestamp: z.number({ error: "timestamp must be a number" }),
	placementCommitment: zHexString(),
	documentSha256: zHexString(),
	placementManifest: zPlacementManifest,
	coldInvites: z
		.array(
			z.object({
				email: z.email(),
				inviteToken: z.string().min(16),
				wrappedEncryptionKey: zHexString(),
				isSigner: z.boolean(),
			}),
		)
		.optional(),
	organizationId: z.uuid(),
	orgKemCiphertext: zHexString(),
	orgEncryptedEncryptionKey: zHexString(),
	displayName: z.string().min(1).max(512),
	mimeType: z.string().min(1).max(255),
	ciphertextByteLength: z.number().int().positive(),
	routing: zRegisterRoutingInput.optional(),
	attachmentPackets: z.array(zAttachmentPacketSendInput).max(3).optional(),
	isPractice: z.boolean().optional(),
	metadata: zEnvelopeMetadata.optional(),
});

export const zFileRegistrationStatusBody = z.object({
	pieceCid: z.string({ error: "pieceCid invalid" }),
});
