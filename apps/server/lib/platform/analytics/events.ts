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

export const PLATFORM_ALERT_EVENTS = {
	serverHttp500: "server.http_500",
	serverCronJobFailed: "server.cron_job_failed",
	serverBootstrapFailed: "server.bootstrap_failed",
	serverDbInfraError: "server.db_infra_error",
	settlementsRelayPayoutFailed: "settlements.relay_payout_failed",
} as const;

export type PlatformAlertEventName =
	(typeof PLATFORM_ALERT_EVENTS)[keyof typeof PLATFORM_ALERT_EVENTS];

type BaseAlertEvent = {
	severity: "error" | "critical";
	message: string;
	context?: Record<string, unknown>;
};

export type PlatformAlertEvent =
	| (BaseAlertEvent & {
			name: typeof PLATFORM_ALERT_EVENTS.serverHttp500;
			context: {
				method: string;
				path: string;
				status: number;
				durationMs: number;
			};
	  })
	| (BaseAlertEvent & {
			name: typeof PLATFORM_ALERT_EVENTS.serverCronJobFailed;
			context: {
				job: string;
				error: string;
			};
	  })
	| (BaseAlertEvent & {
			name: typeof PLATFORM_ALERT_EVENTS.serverBootstrapFailed;
			context: {
				stage: string;
				error: string;
			};
	  })
	| (BaseAlertEvent & {
			name: typeof PLATFORM_ALERT_EVENTS.serverDbInfraError;
			context: {
				source: string;
				error: string;
			};
	  })
	| (BaseAlertEvent & {
			name: typeof PLATFORM_ALERT_EVENTS.settlementsRelayPayoutFailed;
			context: {
				onChainRuleId: string;
				pieceCid?: string;
				status: string;
				error: string;
				txHash?: string;
			};
	  });
