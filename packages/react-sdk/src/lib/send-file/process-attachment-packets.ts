import type { AttachmentPacketSendInput } from "@filosign/shared";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import type { AppRouterClient } from "../../orpc/app-router-types";
import type { AttachmentPacketDraft } from "../attachment-packets";
import {
	encryptAttachmentPacket,
	wrapAttachmentPacketDekForCold,
	wrapAttachmentPacketDekForWarm,
} from "../attachment-packets";
import type { SendFileWarmRecipient } from "./types";

async function uploadAttachmentPacket(args: {
	rpc: AppRouterClient;
	draft: AttachmentPacketDraft;
}): Promise<Awaited<ReturnType<typeof encryptAttachmentPacket>>> {
	const encryptedPacket = await encryptAttachmentPacket({
		packet: args.draft,
	});
	const uploadStart = await args.rpc.attachments.uploadStart({
		packetCid: encryptedPacket.packetCid,
	});
	const putRes = await fetch(uploadStart.uploadUrl, {
		method: "PUT",
		headers: { "Content-Type": "application/octet-stream" },
		body: new Blob([Uint8Array.from(encryptedPacket.ciphertext)]),
	});
	if (!putRes.ok) {
		throw new Error(`Attachment upload failed: ${putRes.statusText}`);
	}
	return encryptedPacket;
}

async function buildRecipientWraps(args: {
	draft: AttachmentPacketDraft;
	encryptedPacket: Awaited<ReturnType<typeof encryptAttachmentPacket>>;
	warmByEmail: Map<string, SendFileWarmRecipient>;
	coldEmailSet: Set<string>;
	coldPhrase?: string;
}): Promise<{
	warmWraps: NonNullable<AttachmentPacketSendInput["warmWraps"]>;
	coldWraps: NonNullable<AttachmentPacketSendInput["coldWraps"]>;
}> {
	const warmWraps: NonNullable<AttachmentPacketSendInput["warmWraps"]> = [];
	const coldWraps: NonNullable<AttachmentPacketSendInput["coldWraps"]> = [];

	for (const email of args.draft.recipientEmails) {
		const normalized = normalizePlacementRecipientEmail(email);
		const warm = args.warmByEmail.get(normalized);
		if (warm) {
			const wrap = await wrapAttachmentPacketDekForWarm({
				packetCid: args.encryptedPacket.packetCid,
				packetId: args.draft.packetId,
				packetDek: args.encryptedPacket.packetDek,
				recipient: {
					email: normalized,
					encryptionPublicKey: warm.encryptionPublicKey,
				},
			});
			warmWraps.push({
				email: normalized,
				kemCiphertext: wrap.kemCiphertext,
				encryptedPacketDek: wrap.encryptedPacketDek,
			});
			continue;
		}
		if (args.coldEmailSet.has(normalized) && args.coldPhrase) {
			coldWraps.push({
				email: normalized,
				wrappedPacketDek: await wrapAttachmentPacketDekForCold({
					packetId: args.draft.packetId,
					packetDek: args.encryptedPacket.packetDek,
					phrase: args.coldPhrase,
				}),
			});
		}
	}

	return { warmWraps, coldWraps };
}

export async function processAttachmentPackets(args: {
	rpc: AppRouterClient;
	attachmentPacketDrafts: AttachmentPacketDraft[];
	warmRecipientsByEmail: SendFileWarmRecipient[];
	coldInvites?: { email: string }[];
	coldPhrase?: string;
}): Promise<AttachmentPacketSendInput[]> {
	const warmByEmail = new Map(
		args.warmRecipientsByEmail.map((r) => [
			normalizePlacementRecipientEmail(r.email),
			r,
		]),
	);
	const coldEmailSet = new Set(
		(args.coldInvites ?? []).map((c) =>
			normalizePlacementRecipientEmail(c.email),
		),
	);
	const attachmentPackets: AttachmentPacketSendInput[] = [];

	for (const draft of args.attachmentPacketDrafts) {
		const encryptedPacket = await uploadAttachmentPacket({
			rpc: args.rpc,
			draft,
		});
		const { warmWraps, coldWraps } = await buildRecipientWraps({
			draft,
			encryptedPacket,
			warmByEmail,
			coldEmailSet,
			coldPhrase: args.coldPhrase,
		});

		attachmentPackets.push({
			packetId: draft.packetId,
			label: draft.label,
			releaseMode: draft.releaseMode,
			releaseType: draft.releaseType,
			releaseParams: draft.releaseParams,
			recipientEmails: draft.recipientEmails.map((e) =>
				normalizePlacementRecipientEmail(e),
			),
			packetCid: encryptedPacket.packetCid,
			packetContentHash: encryptedPacket.packetContentHash,
			warmWraps: warmWraps.length > 0 ? warmWraps : undefined,
			coldWraps: coldWraps.length > 0 ? coldWraps : undefined,
		});
	}

	return attachmentPackets;
}
