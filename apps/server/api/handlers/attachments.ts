import type { Address } from "viem";
import z from "zod";
import {
	attachmentsPacketAccess,
	linkAttachmentPacketOnChainRule,
} from "@/lib/domains/attachments";

const zPacketAccessInput = z.object({
	pieceCid: z.string().min(8),
	packetId: z.string().min(1),
});

export async function attachmentsLinkOnChainRuleHandler(
	userWallet: Address,
	body: unknown,
) {
	return linkAttachmentPacketOnChainRule(userWallet, body);
}

export async function attachmentsPacketAccessHandler(
	userWallet: Address,
	input: z.infer<typeof zPacketAccessInput>,
) {
	return attachmentsPacketAccess({
		userWallet,
		pieceCid: input.pieceCid,
		packetId: input.packetId,
	});
}
