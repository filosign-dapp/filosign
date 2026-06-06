import {
	normalizePlacementRecipientEmail,
	supplementaryPacketUnlockSummary,
} from "@filosign/shared";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { z } from "zod";
import { primaryEmailForWallet } from "@/lib/domains/files";
import db from "@/lib/platform/db";
import { fsAttachmentReleaseAt } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";
import type { SupplementaryPacketForParticipant } from "./attachments";

const {
	files,
	fileParticipants,
	envelopeAttachmentPackets,
	envelopeAttachmentPacketRecipients,
} = db.schema;

export async function listSupplementaryPacketsForParticipant(args: {
	userWallet: Address;
	pieceCid: string;
	signerEmails: readonly string[];
}): Promise<SupplementaryPacketForParticipant[]> {
	const pieceCid = args.pieceCid.trim();
	if (!pieceCid) {
		throw throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					path: ["pieceCid"],
					message: "Invalid pieceCid",
				},
			]),
		);
	}

	const userWallet = getAddress(args.userWallet);
	const profileEmail = await primaryEmailForWallet(userWallet);
	if (!profileEmail) {
		return [];
	}
	const emailKey = normalizePlacementRecipientEmail(profileEmail);

	const [file] = await db
		.select({ sender: files.sender })
		.from(files)
		.where(eq(files.pieceCid, pieceCid))
		.limit(1);
	if (!file) {
		return [];
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
		return [];
	}

	const rows = await db
		.select({
			packetId: envelopeAttachmentPackets.packetId,
			label: envelopeAttachmentPackets.label,
			releaseMode: envelopeAttachmentPackets.releaseMode,
			releaseType: envelopeAttachmentPackets.releaseType,
			releaseParams: envelopeAttachmentPackets.releaseParams,
			onChainRuleId: envelopeAttachmentPackets.onChainRuleId,
			releaseContractAddress: envelopeAttachmentPackets.releaseContractAddress,
			kemCiphertext: envelopeAttachmentPacketRecipients.kemCiphertext,
			encryptedPacketDek: envelopeAttachmentPacketRecipients.encryptedPacketDek,
		})
		.from(envelopeAttachmentPacketRecipients)
		.innerJoin(
			envelopeAttachmentPackets,
			eq(
				envelopeAttachmentPacketRecipients.packetRowId,
				envelopeAttachmentPackets.id,
			),
		)
		.where(
			and(
				eq(envelopeAttachmentPackets.filePieceCid, pieceCid),
				eq(envelopeAttachmentPacketRecipients.email, emailKey),
			),
		);

	if (rows.length === 0) {
		return [];
	}

	const out: SupplementaryPacketForParticipant[] = [];

	for (const row of rows) {
		const unlockConditionLabel = supplementaryPacketUnlockSummary({
			releaseMode: row.releaseMode,
			releaseType: row.releaseType,
			releaseParams: row.releaseParams ?? undefined,
			signerEmails: args.signerEmails,
		});

		let unlocked = row.releaseMode === "review";
		let cancelled = false;

		if (row.releaseMode === "conditional") {
			if (row.onChainRuleId != null && row.releaseContractAddress) {
				const release = fsAttachmentReleaseAt(row.releaseContractAddress);
				if (release) {
					const ruleRes = await tryCatch(
						release.read.rules([row.onChainRuleId]),
					);
					const released = !ruleRes.error && ruleRes.data[8];
					cancelled = !ruleRes.error && ruleRes.data[9];
					unlocked = Boolean(released) && !cancelled;
				}
			}
		}

		if (cancelled) {
			continue;
		}

		out.push({
			packetId: row.packetId,
			label: row.label,
			releaseMode: row.releaseMode,
			unlocked,
			cancelled,
			unlockConditionLabel,
			canDecrypt: Boolean(row.kemCiphertext && row.encryptedPacketDek),
		});
	}

	return out;
}
