import { eq, inArray } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { SERVER_ANALYTICS_EVENTS } from "@/lib/platform/analytics/events";
import { trackServerEvent } from "@/lib/platform/analytics/track";
import db from "@/lib/platform/db";
import {
	sendColdDocumentInviteEmail,
	sendDocumentReceivedEmail,
} from "@/lib/platform/email/invites";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const { users } = db.schema;

export async function notifyParticipantsAfterRegister(args: {
	sender: Address;
	pieceCid: string;
	participantWallets: Address[];
	coldInvites: { email: string; inviteToken: string }[];
	slotCounts: {
		signerSlotCount: number;
		coldInviteCount: number;
		warmParticipantCount: number;
		recipientSlotCount: number;
	};
}) {
	const participantProfiles =
		args.participantWallets.length > 0
			? await db
					.select({
						walletAddress: users.walletAddress,
						email: users.email,
					})
					.from(users)
					.where(inArray(users.walletAddress, args.participantWallets))
			: [];

	const [senderProfile] = await db
		.select({
			email: users.email,
			firstName: users.firstName,
			lastName: users.lastName,
			username: users.username,
		})
		.from(users)
		.where(eq(users.walletAddress, args.sender));

	const senderName =
		[senderProfile?.firstName, senderProfile?.lastName]
			.filter(Boolean)
			.join(" ") ||
		senderProfile?.username ||
		senderProfile?.email ||
		undefined;

	const emailResults = await Promise.all(
		participantProfiles
			.filter((profile) => profile.email)
			.map((profile) =>
				tryCatch(
					sendDocumentReceivedEmail({
						to: profile.email as string,
						senderWallet: args.sender,
						pieceCid: args.pieceCid,
						senderName,
					}),
				),
			),
	);
	const emailFailures = emailResults.filter((result) => result.error);
	if (emailFailures.length > 0) {
		console.error("Failed to send document notification emails", {
			pieceCid: args.pieceCid,
			failedCount: emailFailures.length,
			errors: emailFailures.map((result) => result.error?.message),
		});
	}

	const coldEmailResults = await Promise.all(
		args.coldInvites.map((c) =>
			tryCatch(
				sendColdDocumentInviteEmail({
					to: c.email.trim().toLowerCase(),
					pieceCid: args.pieceCid,
					inviteToken: c.inviteToken,
					senderWallet: args.sender,
					senderName,
				}),
			),
		),
	);
	const coldEmailFailures = coldEmailResults.filter((r) => r.error);
	if (coldEmailFailures.length > 0) {
		console.error("Failed to send cold invite emails", {
			pieceCid: args.pieceCid,
			failedCount: coldEmailFailures.length,
			errors: coldEmailFailures.map((r) => r.error?.message),
		});
	}

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
