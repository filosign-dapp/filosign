import { throwAppError } from "@filosign/errors/server";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { z } from "zod";
import { primaryEmailForWallet } from "@/lib/domains/files";
import db from "@/lib/platform/db";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";
import {
	assertConditionalPacketReleased,
	buildParticipantPacketAccessResponse,
	buildSenderPacketAccessResponse,
} from "./utils/packet-access";

const {
	files,
	fileParticipants,
	envelopeAttachmentPackets,
	envelopeAttachmentPacketRecipients,
	attachmentReleaseRules,
} = db.schema;

export type SupplementaryPacketForParticipant = {
	packetId: string;
	label: string | null;
	releaseMode: "review" | "conditional";
	unlocked: boolean;
	cancelled: boolean;
	unlockConditionLabel: string;
	canDecrypt: boolean;
};

export function attachmentReleaseRuleWhere(args: {
	releaseContractAddress: Address;
	onChainRuleId: bigint;
}) {
	return and(
		eq(
			attachmentReleaseRules.releaseContractAddress,
			getAddress(args.releaseContractAddress),
		),
		eq(attachmentReleaseRules.onChainRuleId, args.onChainRuleId),
	);
}

export async function selectAttachmentReleaseRule(
	onChainRuleId: bigint,
	releaseContractAddress: Address,
) {
	const [row] = await db
		.select()
		.from(attachmentReleaseRules)
		.where(
			attachmentReleaseRuleWhere({
				onChainRuleId,
				releaseContractAddress: getAddress(releaseContractAddress),
			}),
		)
		.limit(1);
	if (!row) {
		throw throwAppError("SETTLEMENTS.RULE_NOT_FOUND");
	}
	return row;
}

export { listSupplementaryPacketsForParticipant } from "./list-supplementary";

export async function attachmentsPacketAccess(args: {
	userWallet: Address;
	pieceCid: string;
	packetId: string;
}) {
	const pieceCid = args.pieceCid.trim();
	const packetId = args.packetId.trim();
	if (!pieceCid || !packetId) {
		throw throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					path: ["pieceCid"],
					message: "Invalid request",
				},
			]),
		);
	}

	const userWallet = getAddress(args.userWallet);
	const profileEmail = await primaryEmailForWallet(userWallet);
	if (!profileEmail) {
		throw throwAppError("ATTACHMENTS.FORBIDDEN");
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
		throw throwAppError("ATTACHMENTS.PACKET_NOT_FOUND");
	}

	const access = await resolvePacketParticipantAccess({
		userWallet,
		pieceCid,
		packetRowId: packet.id,
		emailKey,
	});

	if (access.isSender) {
		return buildSenderPacketAccessResponse({
			packetId: packet.packetId,
			packetCid: packet.packetCid,
			label: packet.label,
			releaseMode: packet.releaseMode,
		});
	}

	if (packet.releaseMode === "conditional") {
		if (packet.onChainRuleId == null || !packet.releaseContractAddress) {
			throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
				params: { reason: "Conditional packet missing on-chain rule" },
			});
		}
		await assertConditionalPacketReleased({
			onChainRuleId: packet.onChainRuleId,
			releaseContractAddress: packet.releaseContractAddress,
		});
	}

	return buildParticipantPacketAccessResponse({
		packetId: packet.packetId,
		packetCid: packet.packetCid,
		label: packet.label,
		releaseMode: packet.releaseMode,
		recipientRow: access.recipientRow,
	});
}

async function resolvePacketParticipantAccess(args: {
	userWallet: Address;
	pieceCid: string;
	packetRowId: string;
	emailKey: string;
}) {
	const userWallet = getAddress(args.userWallet);

	const [file] = await db
		.select({ sender: files.sender })
		.from(files)
		.where(eq(files.pieceCid, args.pieceCid))
		.limit(1);
	if (!file) {
		throw throwAppError("FILES.NOT_FOUND");
	}

	const isSender = getAddress(file.sender) === userWallet;
	const [participant] = await db
		.select({ wallet: fileParticipants.wallet })
		.from(fileParticipants)
		.where(
			and(
				eq(fileParticipants.filePieceCid, args.pieceCid),
				eq(fileParticipants.wallet, userWallet),
			),
		)
		.limit(1);

	if (!isSender && !participant) {
		throw throwAppError("ATTACHMENTS.FORBIDDEN");
	}

	const [recipientRow] = await db
		.select()
		.from(envelopeAttachmentPacketRecipients)
		.where(
			and(
				eq(envelopeAttachmentPacketRecipients.packetRowId, args.packetRowId),
				eq(envelopeAttachmentPacketRecipients.email, args.emailKey),
			),
		)
		.limit(1);

	if (!recipientRow && !isSender) {
		throw throwAppError("ATTACHMENTS.FORBIDDEN");
	}

	return { isSender, recipientRow };
}
