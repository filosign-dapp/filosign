import { throwAppError } from "@filosign/errors/server";
import type { zAttachmentPacketSendInput } from "@filosign/shared";
import { hashNormalizedSignerEmail } from "@filosign/shared";
import type { Hex } from "viem";
import { getAddress } from "viem";
import type z from "zod";
import db from "@/lib/platform/db";
import { bucket } from "@/lib/platform/s3/client";

const {
	envelopeAttachmentPackets,
	envelopeAttachmentPacketRecipients,
	envelopeAttachmentPacketColdWraps,
	attachmentReleaseRules,
} = db.schema;

type PacketInput = z.infer<typeof zAttachmentPacketSendInput>;
type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function assertAttachmentPacketsExistInStorage(
	packets: PacketInput[],
): Promise<void> {
	for (const packet of packets) {
		const storageKey = `uploads/attachments/${packet.packetCid}`;
		if (!(await bucket.exists(storageKey))) {
			throw throwAppError("ATTACHMENTS.PACKET_NOT_FOUND");
		}
	}
}

export async function insertSingleAttachmentPacket(
	tx: DbTx,
	args: {
		pieceCid: string;
		packet: PacketInput;
		coldInviteToken?: string;
	},
): Promise<void> {
	const { pieceCid, packet, coldInviteToken } = args;

	const [packetRow] = await tx
		.insert(envelopeAttachmentPackets)
		.values({
			filePieceCid: pieceCid,
			packetId: packet.packetId,
			packetCid: packet.packetCid,
			label: packet.label ?? null,
			releaseMode: packet.releaseMode,
			releaseType:
				packet.releaseMode === "conditional"
					? (packet.releaseType ?? null)
					: null,
			releaseParams: packet.releaseParams ?? null,
			onChainRuleId:
				packet.onChainRuleId != null && packet.onChainRuleId !== ""
					? BigInt(packet.onChainRuleId)
					: null,
			releaseContractAddress: packet.releaseContractAddress
				? getAddress(packet.releaseContractAddress)
				: null,
			registerRuleTxHash:
				(packet.registerRuleTxHash as Hex | undefined) ?? null,
			orgKemCiphertext: packet.orgWrap?.kemCiphertext
				? (packet.orgWrap.kemCiphertext as Hex)
				: null,
			orgEncryptedPacketDek: packet.orgWrap?.encryptedPacketDek
				? (packet.orgWrap.encryptedPacketDek as Hex)
				: null,
		})
		.returning({ id: envelopeAttachmentPackets.id });

	if (!packetRow) return;

	await insertPacketRecipients(tx, {
		packetRowId: packetRow.id,
		packet,
		coldInviteToken,
	});

	if (
		packet.releaseMode === "conditional" &&
		packet.onChainRuleId != null &&
		packet.onChainRuleId !== "" &&
		packet.releaseContractAddress &&
		packet.packetContentHash
	) {
		await tx.insert(attachmentReleaseRules).values({
			packetRowId: packetRow.id,
			filePieceCid: pieceCid,
			onChainRuleId: BigInt(packet.onChainRuleId),
			releaseContractAddress: getAddress(packet.releaseContractAddress),
			packetContentHash: packet.packetContentHash as Hex,
		});
	}
}

async function insertPacketRecipients(
	tx: DbTx,
	args: {
		packetRowId: string;
		packet: PacketInput;
		coldInviteToken?: string;
	},
): Promise<void> {
	const wrappedEmails = new Set<string>();

	if (args.packet.senderWrap) {
		const sender = args.packet.senderWrap;
		wrappedEmails.add(sender.email.trim().toLowerCase());
		await tx.insert(envelopeAttachmentPacketRecipients).values({
			packetRowId: args.packetRowId,
			email: sender.email.trim().toLowerCase(),
			emailCommitment: hashNormalizedSignerEmail(sender.email),
			deliveryKind: "warm" as const,
			kemCiphertext: sender.kemCiphertext as Hex,
			encryptedPacketDek: sender.encryptedPacketDek as Hex,
		});
	}

	if (args.packet.warmWraps?.length) {
		for (const w of args.packet.warmWraps) {
			wrappedEmails.add(w.email.trim().toLowerCase());
		}
		await tx.insert(envelopeAttachmentPacketRecipients).values(
			args.packet.warmWraps.map((w) => ({
				packetRowId: args.packetRowId,
				email: w.email.trim().toLowerCase(),
				emailCommitment: hashNormalizedSignerEmail(w.email),
				deliveryKind: "warm" as const,
				kemCiphertext: w.kemCiphertext as Hex,
				encryptedPacketDek: w.encryptedPacketDek as Hex,
			})),
		);
	}

	if (args.packet.releaseMode === "review") {
		const reviewOnly = args.packet.recipientEmails
			.map((e) => e.trim().toLowerCase())
			.filter((email) => !wrappedEmails.has(email));
		if (reviewOnly.length > 0) {
			await tx.insert(envelopeAttachmentPacketRecipients).values(
				reviewOnly.map((email) => ({
					packetRowId: args.packetRowId,
					email,
					emailCommitment: hashNormalizedSignerEmail(email),
					deliveryKind: "warm" as const,
				})),
			);
		}
	}

	if (args.packet.coldWraps?.length) {
		const token = args.coldInviteToken?.trim();
		if (!token) {
			throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
				params: {
					reason: "Cold packet wraps require envelope cold invite",
				},
			});
		}
		await tx.insert(envelopeAttachmentPacketColdWraps).values(
			args.packet.coldWraps.map((c) => ({
				packetRowId: args.packetRowId,
				email: c.email.trim().toLowerCase(),
				wrappedPacketDek: c.wrappedPacketDek as Hex,
				inviteToken: token,
			})),
		);
	}
}
