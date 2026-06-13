import z from "zod";
import { normalizePlacementRecipientEmail } from "./placement";
import {
	settlementReleaseTypes,
	zSettlementReleaseParams,
} from "./settlement-rules";
import { isSafeSupplementaryAttachmentFileName } from "./supplementary-attachment-upload";

export const ATTACHMENT_DOWNLOAD_DISCLAIMER_TITLE = "Download attached files?";

export const ATTACHMENT_DOWNLOAD_DISCLAIMER_DESCRIPTION =
	"These files were attached by the sender. Filosign encrypts them end-to-end and does not inspect or scan their contents. You are responsible for scanning downloads on your device before opening them. Filosign is not liable for sender-provided file content.";

export const attachmentPacketReleaseModes = ["review", "conditional"] as const;
export type AttachmentPacketReleaseMode =
	(typeof attachmentPacketReleaseModes)[number];

export const zAttachmentPacketFile = z.object({
	id: z.string().min(1),
	name: z
		.string()
		.min(1)
		.max(255)
		.refine(isSafeSupplementaryAttachmentFileName, {
			error: "Invalid attachment file name",
		}),
	mimeType: z.string().min(1),
	sha256Plaintext: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
	bytesB64: z.string().min(1),
});

export const zAttachmentPacketPlaintext = z.object({
	version: z.literal(1),
	packetId: z.string().min(1),
	label: z.string().optional(),
	files: z.array(zAttachmentPacketFile).min(1).max(3),
});

export const zAttachmentPacketSendInput = z
	.object({
		packetId: z.string().min(1),
		label: z.string().optional(),
		releaseMode: z.enum(attachmentPacketReleaseModes),
		releaseType: z.enum(settlementReleaseTypes).optional(),
		releaseParams: zSettlementReleaseParams.optional(),
		recipientEmails: z.array(z.email()).min(1),
		packetCid: z.string().min(8),
		/** Warm KEM wraps for listed recipients with wallets. */
		warmWraps: z
			.array(
				z.object({
					email: z.email(),
					kemCiphertext: z.string(),
					encryptedPacketDek: z.string(),
				}),
			)
			.optional(),
		senderWrap: z
			.object({
				email: z.email(),
				kemCiphertext: z.string(),
				encryptedPacketDek: z.string(),
			})
			.optional(),
		orgWrap: z
			.object({
				kemCiphertext: z.string(),
				encryptedPacketDek: z.string(),
			})
			.optional(),
		/** Phrase wraps for cold roster emails on this packet. */
		coldWraps: z
			.array(
				z.object({
					email: z.email(),
					wrappedPacketDek: z.string(),
				}),
			)
			.optional(),
		packetContentHash: z
			.string()
			.regex(/^0x[0-9a-fA-F]{64}$/)
			.optional(),
		onChainRuleId: z.string().optional(),
		releaseContractAddress: z.string().optional(),
		registerRuleTxHash: z.string().optional(),
	})
	.superRefine((packet, ctx) => {
		if (packet.releaseMode === "conditional") {
			if (!packet.releaseType) {
				ctx.addIssue({
					code: "custom",
					message: "releaseType is required for conditional packets",
					path: ["releaseType"],
				});
			}
			if (!packet.releaseParams) {
				ctx.addIssue({
					code: "custom",
					message: "releaseParams is required for conditional packets",
					path: ["releaseParams"],
				});
			} else if (
				packet.releaseType &&
				packet.releaseParams.releaseType !== packet.releaseType
			) {
				ctx.addIssue({
					code: "custom",
					message: "releaseType must match releaseParams.releaseType",
					path: ["releaseParams"],
				});
			}
			return;
		}
		if (packet.releaseType !== undefined) {
			ctx.addIssue({
				code: "custom",
				message: "releaseType is only allowed for conditional packets",
				path: ["releaseType"],
			});
		}
		if (packet.releaseParams !== undefined) {
			ctx.addIssue({
				code: "custom",
				message: "releaseParams is only allowed for conditional packets",
				path: ["releaseParams"],
			});
		}
	});

export type AttachmentPacketSendInput = z.infer<
	typeof zAttachmentPacketSendInput
>;

export const zEnvelopeColdInviteRef = z.object({
	email: z.email(),
	inviteToken: z.string().min(16),
});

export type EnvelopeColdInviteRef = z.infer<typeof zEnvelopeColdInviteRef>;

/** Normalized email -> invite token for cold attachment wrap persistence. */
export function mapColdInviteTokensByEmail(
	coldInvites: EnvelopeColdInviteRef[],
): Map<string, string> {
	const tokenByEmail = new Map<string, string>();
	for (const invite of coldInvites) {
		const email = normalizePlacementRecipientEmail(invite.email);
		const token = invite.inviteToken.trim();
		if (email && token) {
			tokenByEmail.set(email, token);
		}
	}
	return tokenByEmail;
}
