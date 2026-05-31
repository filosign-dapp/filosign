import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { primaryEmailForWallet } from "@/lib/domains/files";
import db from "@/lib/platform/db";
import { fsAttachmentReleaseAt } from "@/lib/platform/evm";
import { bucket } from "@/lib/platform/s3/client";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const {
	files,
	fileParticipants,
	envelopeAttachmentPackets,
	envelopeAttachmentPacketRecipients,
} = db.schema;

export async function attachmentsPacketAccess(args: {
	userWallet: Address;
	pieceCid: string;
	packetId: string;
}) {
	const pieceCid = args.pieceCid.trim();
	const packetId = args.packetId.trim();
	if (!pieceCid || !packetId) {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid request" });
	}

	const userWallet = getAddress(args.userWallet);
	const profileEmail = await primaryEmailForWallet(userWallet);
	if (!profileEmail) {
		throw new ORPCError("FORBIDDEN", {
			message: "Profile email required to access attachment packets",
		});
	}
	const emailKey = normalizePlacementRecipientEmail(profileEmail);

	const [packet] = await db
		.select()
		.from(envelopeAttachmentPackets)
		.where(
			and(
				eq(envelopeAttachmentPackets.filePieceCid, pieceCid),
				eq(envelopeAttachmentPackets.packetId, packetId),
			),
		)
		.limit(1);
	if (!packet) {
		throw new ORPCError("NOT_FOUND", {
			message: "Attachment packet not found",
		});
	}

	const [file] = await db
		.select({
			sender: files.sender,
			organizationId: files.organizationId,
			orgKemCiphertext: files.orgKemCiphertext,
			orgEncryptedEncryptionKey: files.orgEncryptedEncryptionKey,
		})
		.from(files)
		.where(eq(files.pieceCid, pieceCid))
		.limit(1);
	if (!file) {
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
	}

	const isSender = getAddress(file.sender) === userWallet;
	const [participant] = await db
		.select({ wallet: fileParticipants.wallet })
		.from(fileParticipants)
		.where(
			and(
				eq(fileParticipants.filePieceCid, pieceCid),
				eq(fileParticipants.wallet, userWallet),
			),
		)
		.limit(1);

	if (!isSender && !participant) {
		throw new ORPCError("FORBIDDEN", {
			message: "Not allowed to access attachment packets for this file",
		});
	}

	const [recipientRow] = await db
		.select()
		.from(envelopeAttachmentPacketRecipients)
		.where(
			and(
				eq(envelopeAttachmentPacketRecipients.packetRowId, packet.id),
				eq(envelopeAttachmentPacketRecipients.email, emailKey),
			),
		)
		.limit(1);

	if (!recipientRow && !isSender) {
		throw new ORPCError("FORBIDDEN", {
			message: "This attachment packet is not shared with your email",
		});
	}

	if (isSender) {
		const storageKey = `uploads/attachments/${packet.packetCid}`;
		if (!(await bucket.exists(storageKey))) {
			throw new ORPCError("NOT_FOUND", {
				message: "Packet ciphertext not found",
			});
		}
		return {
			packetId: packet.packetId,
			packetCid: packet.packetCid,
			label: packet.label,
			releaseMode: packet.releaseMode,
			downloadUrl: bucket.presign(storageKey, {
				method: "GET",
				expiresIn: 60 * 5,
			}),
		};
	}

	if (packet.releaseMode === "conditional") {
		if (!packet.onChainRuleId || !packet.releaseContractAddress) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Conditional packet missing on-chain rule",
			});
		}
		const release = fsAttachmentReleaseAt(packet.releaseContractAddress);
		if (!release) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Attachment release contract unavailable",
			});
		}
		const rulesRes = await tryCatch(release.read.rules([packet.onChainRuleId]));
		const released = !rulesRes.error && rulesRes.data[8];
		const cancelled = !rulesRes.error && rulesRes.data[9];
		if (cancelled || !released) {
			throw new ORPCError("FORBIDDEN", {
				message: "Attachment packet is not yet releasable",
			});
		}
	}

	const storageKey = `uploads/attachments/${packet.packetCid}`;
	if (!(await bucket.exists(storageKey))) {
		throw new ORPCError("NOT_FOUND", {
			message: "Packet ciphertext not found",
		});
	}

	const downloadUrl = bucket.presign(storageKey, {
		method: "GET",
		expiresIn: 60 * 5,
	});

	return {
		packetId: packet.packetId,
		packetCid: packet.packetCid,
		label: packet.label,
		releaseMode: packet.releaseMode,
		downloadUrl,
		...(recipientRow?.kemCiphertext && recipientRow.encryptedPacketDek
			? {
					kemCiphertext: recipientRow.kemCiphertext,
					encryptedPacketDek: recipientRow.encryptedPacketDek,
				}
			: {}),
	};
}
