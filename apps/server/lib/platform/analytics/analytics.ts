import { isOrpcErrorLike, readAppCodeFromOrpc } from "@filosign/errors";
import type { PostHogExceptionProperties } from "@filosign/logger";
import { createPostHogRuntime } from "@filosign/logger";
import {
	type AnalyticsProperties,
	scrubAnalyticsProperties,
} from "@filosign/shared";

// ==========================================
// 1. Events Constants & Types
// ==========================================
export const SERVER_ANALYTICS_EVENTS = {
	userRegistered: "user_registered",
	fileRegistered: "file_registered",
	coldInviteCreated: "cold_invite_created",
	coldInviteClaimed: "cold_invite_claimed",
	coldInviteExpired: "cold_invite_expired",
	sharingInviteClaimed: "sharing_invite_claimed",
	pieceAcknowledged: "piece_acknowledged",
	documentViewed: "document_viewed",
	pieceSigned: "piece_signed",
	envelopeFullySigned: "envelope_fully_signed",
	activationMilestoneRecorded: "activation_milestone_recorded",
} as const;

export type ServerAnalyticsEvent =
	(typeof SERVER_ANALYTICS_EVENTS)[keyof typeof SERVER_ANALYTICS_EVENTS];

// ==========================================
// 2. Exception Properties Helper
// ==========================================
export type ServerExceptionProperties = Record<
	string,
	string | number | boolean
>;

export function toPostHogExceptionProperties(
	properties: AnalyticsProperties,
): PostHogExceptionProperties {
	const out: PostHogExceptionProperties = {};
	for (const [key, value] of Object.entries(properties)) {
		if (
			typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "boolean" ||
			value === null ||
			value === undefined
		) {
			out[key] = value;
		}
	}
	return out;
}

// ==========================================
// 3. Exception Filtering Helper
// ==========================================
const SKIP_ORPC_CODES = [
	"UNAUTHORIZED",
	"FORBIDDEN",
	"BAD_REQUEST",
	"NOT_FOUND",
	"CONFLICT",
	"PAYLOAD_TOO_LARGE",
	"PRECONDITION_FAILED",
	"METHOD_NOT_SUPPORTED",
	"UNPROCESSABLE_CONTENT",
	"TIMEOUT",
] as const satisfies readonly string[];

const SKIP_ORPC_CODE_SET = new Set<string>(SKIP_ORPC_CODES);

export function shouldCaptureServerException(error: unknown): boolean {
	if (isOrpcErrorLike(error)) {
		if (readAppCodeFromOrpc(error)) return false;
		if (SKIP_ORPC_CODE_SET.has(error.code)) return false;
		if (error.code === "INTERNAL_SERVER_ERROR") return true;
		return false;
	}
	return error instanceof Error;
}

// ==========================================
// 4. Envelope Context Helper
// ==========================================
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

// ==========================================
// 5. PostHog Client Runtime & Capture
// ==========================================
function readPostHogConfig() {
	const enabled = process.env.POSTHOG_ENABLED === "true";
	const apiKey = process.env.POSTHOG_API_KEY;
	const host = process.env.POSTHOG_HOST?.trim();
	if (!host) {
		throw new Error("POSTHOG_HOST is required");
	}
	return { enabled, apiKey, host };
}

function readAnalyticsChain(): string {
	return process.env.CHAIN?.trim() || "local";
}

export function readAnalyticsDeployment(): string {
	return process.env.DEPLOYMENT?.trim() || "local";
}

let runtime: ReturnType<typeof createPostHogRuntime> | null = null;

export function getPostHogRuntime() {
	if (runtime) return runtime;
	const config = readPostHogConfig();
	runtime = createPostHogRuntime({
		enabled: config.enabled,
		apiKey: config.apiKey,
		host: config.host,
		chain: readAnalyticsChain(),
		service: "filosign-server",
	});
	return runtime;
}

function baseEventProperties(): Record<string, string> {
	return {
		chain: readAnalyticsChain(),
		deployment: readAnalyticsDeployment(),
	};
}

const SERVICE_DISTINCT_ID = "service:filosign-server";

export function captureEvent(args: {
	distinctId: string;
	event: string;
	properties?: Record<string, unknown>;
	groups?: Record<string, string>;
}): void {
	getPostHogRuntime().captureEvent({
		...args,
		properties: {
			...baseEventProperties(),
			...args.properties,
		},
	});
}

export function captureServerException(
	error: unknown,
	properties?: ServerExceptionProperties,
): void {
	const scrubbed = properties
		? toPostHogExceptionProperties(
				scrubAnalyticsProperties(properties satisfies AnalyticsProperties),
			)
		: undefined;
	getPostHogRuntime().captureException({
		error,
		distinctId: SERVICE_DISTINCT_ID,
		properties: {
			...baseEventProperties(),
			...scrubbed,
		},
	});
}

export async function shutdownPostHog(): Promise<void> {
	if (!runtime) return;
	await runtime.shutdown();
	runtime = null;
}

export function resetPostHogClientForTests(): void {
	runtime?.resetForTests();
	runtime = null;
}

// ==========================================
// 6. Track Server Event Helper
// ==========================================
export function trackServerEvent(args: {
	distinctId: string;
	event: ServerAnalyticsEvent | string;
	pieceCid?: string;
	properties?: Record<string, unknown>;
}): void {
	const envelope = args.pieceCid?.trim()
		? envelopeAnalyticsContext(args.pieceCid)
		: undefined;

	captureEvent({
		distinctId: args.distinctId,
		event: args.event,
		properties: {
			...args.properties,
			...envelope?.properties,
		},
		groups: envelope?.groups,
	});
}
