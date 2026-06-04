import z from "zod";
import {
	settlementReleaseTypes,
	zSettlementReleaseParams,
} from "./settlement-rules";

export const attachmentPacketReleaseModes = ["review", "conditional"] as const;
export type AttachmentPacketReleaseMode =
	(typeof attachmentPacketReleaseModes)[number];

export const zAttachmentPacketFile = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
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
