/** PostHog group type for per-envelope (piece) lifecycle funnels. */
export const POSTHOG_ENVELOPE_GROUP = "envelope" as const;

export const PIECE_CID_PROPERTY = "piece_cid" as const;

export function envelopeAnalyticsContext(pieceCid: string): {
	properties: { piece_cid: string };
	groups: Record<typeof POSTHOG_ENVELOPE_GROUP, string>;
} {
	const trimmed = pieceCid.trim();
	return {
		properties: { [PIECE_CID_PROPERTY]: trimmed },
		groups: { [POSTHOG_ENVELOPE_GROUP]: trimmed },
	};
}
