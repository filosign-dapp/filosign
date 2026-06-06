import { throwAppError } from "@filosign/errors/server";
import type { AttachmentPacketReleaseMode } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import type { Address } from "viem";
import { fsAttachmentReleaseAt } from "@/lib/platform/evm";
import { bucket } from "@/lib/platform/s3/client";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const ATTACHMENT_STORAGE_PREFIX = "uploads/attachments/";

export async function assertAttachmentObjectExists(
	packetCid: string,
): Promise<string> {
	const storageKey = `${ATTACHMENT_STORAGE_PREFIX}${packetCid}`;
	if (!(await bucket.exists(storageKey))) {
		throw throwAppError("ATTACHMENTS.PACKET_NOT_FOUND");
	}
	return storageKey;
}

export function presignAttachmentDownload(storageKey: string): string {
	return bucket.presign(storageKey, {
		method: "GET",
		expiresIn: 60 * 5,
	});
}

export async function assertConditionalPacketReleased(args: {
	onChainRuleId: bigint;
	releaseContractAddress: Address;
}): Promise<void> {
	const release = fsAttachmentReleaseAt(args.releaseContractAddress);
	if (!release) {
		throw new ORPCError("INTERNAL_SERVER_ERROR" /* error-audit-allow */, {
			message: "Attachment release contract unavailable",
		});
	}
	const rulesRes = await tryCatch(release.read.rules([args.onChainRuleId]));
	const released = !rulesRes.error && rulesRes.data[8];
	const cancelled = !rulesRes.error && rulesRes.data[9];
	if (cancelled || !released) {
		throw throwAppError("ATTACHMENTS.FORBIDDEN");
	}
}

export async function buildSenderPacketAccessResponse(args: {
	packetId: string;
	packetCid: string;
	label: string | null;
	releaseMode: AttachmentPacketReleaseMode;
}) {
	const storageKey = await assertAttachmentObjectExists(args.packetCid);
	return {
		packetId: args.packetId,
		packetCid: args.packetCid,
		label: args.label,
		releaseMode: args.releaseMode,
		downloadUrl: presignAttachmentDownload(storageKey),
	};
}

export async function buildParticipantPacketAccessResponse(args: {
	packetId: string;
	packetCid: string;
	label: string | null;
	releaseMode: AttachmentPacketReleaseMode;
	recipientRow?: {
		kemCiphertext: string | null;
		encryptedPacketDek: string | null;
	} | null;
}) {
	const storageKey = await assertAttachmentObjectExists(args.packetCid);
	return {
		packetId: args.packetId,
		packetCid: args.packetCid,
		label: args.label,
		releaseMode: args.releaseMode,
		downloadUrl: presignAttachmentDownload(storageKey),
		...(args.recipientRow?.kemCiphertext && args.recipientRow.encryptedPacketDek
			? {
					kemCiphertext: args.recipientRow.kemCiphertext,
					encryptedPacketDek: args.recipientRow.encryptedPacketDek,
				}
			: {}),
	};
}
