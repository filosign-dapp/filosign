import type { AttachmentPacketSendInput } from "./attachment";
import { SUPPLEMENTARY_ATTACHMENT_LIMITS } from "./file-data";

export type AttachmentPacketValidationIssue = {
	code: string;
	message: string;
};

export function validateAttachmentPacketsForSend(args: {
	supplementaryAttachments: boolean;
	recipientSelect: boolean;
	conditionalRelease: boolean;
	packets: AttachmentPacketSendInput[];
	rosterEmails: string[];
}): AttachmentPacketValidationIssue[] {
	const issues: AttachmentPacketValidationIssue[] = [];
	if (args.packets.length === 0) return issues;
	if (!args.supplementaryAttachments) {
		issues.push({
			code: "FEATURE_DISABLED",
			message: "Supplementary attachments are not available on your plan",
		});
		return issues;
	}
	if (
		args.packets.length > SUPPLEMENTARY_ATTACHMENT_LIMITS.maxPacketsPerEnvelope
	) {
		issues.push({
			code: "PACKET_LIMIT",
			message: `At most ${SUPPLEMENTARY_ATTACHMENT_LIMITS.maxPacketsPerEnvelope} attachment packets per envelope`,
		});
	}
	const roster = new Set(args.rosterEmails.map((e) => e.trim().toLowerCase()));
	for (const packet of args.packets) {
		for (const email of packet.recipientEmails) {
			if (!roster.has(email.trim().toLowerCase())) {
				issues.push({
					code: "OFF_ROSTER_RECIPIENT",
					message: `Recipient ${email} is not on the envelope roster`,
				});
			}
		}
		if (!args.recipientSelect && packet.recipientEmails.length < roster.size) {
			issues.push({
				code: "RECIPIENT_SELECT_DISABLED",
				message: "Your plan includes all roster recipients on every packet",
			});
		}
		if (packet.releaseMode === "conditional" && !args.conditionalRelease) {
			issues.push({
				code: "CONDITIONAL_DISABLED",
				message: "Conditional attachment release requires Teams Pro",
			});
		}
	}
	return issues;
}

export function validateAttachmentPacketDraftsForSend(args: {
	supplementaryAttachments: boolean;
	recipientSelect: boolean;
	conditionalRelease: boolean;
	drafts: {
		releaseMode: "review" | "conditional";
		recipientEmails: string[];
	}[];
	rosterEmails: string[];
}): AttachmentPacketValidationIssue[] {
	return validateAttachmentPacketsForSend({
		supplementaryAttachments: args.supplementaryAttachments,
		recipientSelect: args.recipientSelect,
		conditionalRelease: args.conditionalRelease,
		rosterEmails: args.rosterEmails,
		packets: args.drafts.map((draft, index) => ({
			packetId: `draft-${index}`,
			releaseMode: draft.releaseMode,
			recipientEmails: draft.recipientEmails,
			packetCid: "0".repeat(64),
		})),
	});
}
