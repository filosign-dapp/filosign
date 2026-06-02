import type { Address } from "viem";
import { getAddress } from "viem";
import { SERVER_ANALYTICS_EVENTS } from "@/lib/platform/analytics/events";
import { trackServerEvent } from "@/lib/platform/analytics/track";

/** Post-register analytics only — email is sent via job_outbox + BullMQ. */
export function trackRegisterAnalytics(args: {
	sender: Address;
	pieceCid: string;
	slotCounts: {
		signerSlotCount: number;
		coldInviteCount: number;
		warmParticipantCount: number;
		recipientSlotCount: number;
	};
}) {
	trackServerEvent({
		distinctId: getAddress(args.sender),
		event: SERVER_ANALYTICS_EVENTS.fileRegistered,
		pieceCid: args.pieceCid,
		properties: {
			signer_count: args.slotCounts.signerSlotCount,
			cold_invite_count: args.slotCounts.coldInviteCount,
			warm_participant_count: args.slotCounts.warmParticipantCount,
			recipient_slot_count: args.slotCounts.recipientSlotCount,
		},
	});
	if (args.slotCounts.coldInviteCount > 0) {
		trackServerEvent({
			distinctId: getAddress(args.sender),
			event: SERVER_ANALYTICS_EVENTS.coldInviteCreated,
			pieceCid: args.pieceCid,
			properties: { cold_invite_count: args.slotCounts.coldInviteCount },
		});
	}
}
