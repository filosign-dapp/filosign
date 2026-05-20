/** Billable recipient slots for envelope.recipients.max (excludes sender). */
export function recipientSlotCounts(args: {
	participants: { isSigner?: boolean | undefined }[];
	coldInvites: { isSigner: boolean }[];
}) {
	const warmParticipantCount = args.participants.length;
	const coldInviteCount = args.coldInvites.length;
	const recipientSlotCount = warmParticipantCount + coldInviteCount;
	const signerSlotCount =
		args.participants.filter((p) => p.isSigner).length +
		args.coldInvites.filter((c) => c.isSigner).length;

	return {
		warmParticipantCount,
		coldInviteCount,
		recipientSlotCount,
		signerSlotCount,
	};
}
