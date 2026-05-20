export const SERVER_ANALYTICS_EVENTS = {
	userRegistered: "user_registered",
	fileRegistered: "file_registered",
	coldInviteCreated: "cold_invite_created",
	coldInviteClaimed: "cold_invite_claimed",
	coldInviteExpired: "cold_invite_expired",
	sharingInviteClaimed: "sharing_invite_claimed",
	pieceAcknowledged: "piece_acknowledged",
	pieceSigned: "piece_signed",
	envelopeFullySigned: "envelope_fully_signed",
} as const;

export type ServerAnalyticsEvent =
	(typeof SERVER_ANALYTICS_EVENTS)[keyof typeof SERVER_ANALYTICS_EVENTS];
