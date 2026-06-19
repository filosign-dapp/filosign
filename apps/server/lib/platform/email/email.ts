import { createHash } from "node:crypto";
import {
	SESv2Client,
	SendEmailCommand,
	type SendEmailCommandInput,
} from "@aws-sdk/client-sesv2";
import { Resend } from "resend";
import env from "@/env";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import type {
	EmailDeliveryProvider,
	EmailDeliveryResult,
	OutboundEmail,
} from "./utils";
import { outboundEmailDefaults, sesFromAddress } from "./utils";

// ==========================================
// 1. Provider readiness
// ==========================================
export function isSesDeliveryConfigured(): boolean {
	if (!env.SES_ENABLED) return false;
	if (!env.SES_REGION?.trim()) return false;
	if (!env.SES_FROM_EMAIL?.trim()) return false;
	return true;
}

export function isResendDeliveryConfigured(): boolean {
	if (!env.RESEND_ENABLED) return false;
	if (!env.RESEND_API_KEY?.trim()) return false;
	if (!env.RESEND_FROM_EMAIL?.trim()) return false;
	return true;
}

export function isOutboundEmailConfigured(): boolean {
	return isSesDeliveryConfigured() || isResendDeliveryConfigured();
}

export function warnIfSesMisconfigured(): void {
	if (!env.SES_ENABLED) return;
	const missing: string[] = [];
	if (!env.SES_REGION?.trim()) missing.push("SES_REGION");
	if (!env.SES_FROM_EMAIL?.trim()) missing.push("SES_FROM_EMAIL");
	if (missing.length === 0) return;
	console.warn(
		`[email] SES_ENABLED=true but missing ${missing.join(", ")}; SES delivery is disabled until configured.`,
	);
}

// ==========================================
// 2. Retryable failure classifiers
// ==========================================
const RETRYABLE_HINTS = [
	"rate limit",
	"throttl",
	"429",
	"timeout",
	"timed out",
	"econnreset",
	"enotfound",
	"network",
	"fetch failed",
	"502",
	"503",
	"504",
	"bad gateway",
	"service unavailable",
	"gateway timeout",
	"internal server error",
	"too many requests",
	"serviceunavailableexception",
	"throttling",
] as const;

export type ProviderFailureLike = {
	statusCode?: number | null;
	message?: string;
	name?: string;
	$metadata?: { httpStatusCode?: number };
};

function failureText(error: unknown): string {
	if (!error || typeof error !== "object") return "";
	const e = error as ProviderFailureLike;
	const httpStatus = e.$metadata?.httpStatusCode;
	const parts = [e.name, e.message]
		.filter((v): v is string => typeof v === "string")
		.concat(typeof httpStatus === "number" ? [String(httpStatus)] : []);
	return parts.join(" ").toLowerCase();
}

function isRetryableProviderFailure(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;
	const e = error as ProviderFailureLike;
	const status =
		typeof e.statusCode === "number"
			? e.statusCode
			: e.$metadata?.httpStatusCode;
	if (typeof status === "number") {
		if (status === 429) return true;
		if (status >= 500) return true;
		if (status >= 400 && status < 500) return false;
	}
	const text = failureText(error);
	return RETRYABLE_HINTS.some((hint) => text.includes(hint));
}

/** Classify Resend/API failures eligible for SES fallback (not validation 4xx). */
export function isRetryableResendFailure(error: unknown): boolean {
	return isRetryableProviderFailure(error);
}

/** Classify SES failures eligible for Resend fallback (not validation 4xx). */
export function isRetryableSesFailure(error: unknown): boolean {
	return isRetryableProviderFailure(error);
}

export function toResendFailureError(error: {
	message: string;
	statusCode?: number | null;
	name?: string;
}): Error {
	const err = new Error(error.message);
	if (typeof error.statusCode === "number") {
		Object.assign(err, { statusCode: error.statusCode });
	}
	return err;
}

// ==========================================
// 3. Resend transport
// ==========================================
let resendClient: Resend | null = null;

function getResendClient(): Resend {
	const apiKey = env.RESEND_API_KEY?.trim();
	if (!apiKey) {
		throw new Error("RESEND_API_KEY is not set");
	}
	if (!resendClient) {
		resendClient = new Resend(apiKey);
	}
	return resendClient;
}

/** @internal Test-only reset. */
export function resetResendClientForTests(): void {
	resendClient = null;
}

export async function sendViaResend(
	msg: OutboundEmail,
): Promise<{ id: string }> {
	const { data, error } = await getResendClient().emails.send(
		{
			from: msg.from,
			to: msg.to,
			subject: msg.subject,
			text: msg.text,
			html: msg.html,
			replyTo: msg.replyTo,
		},
		{
			headers: {
				"Idempotency-Key": msg.idempotencyKey,
			},
		},
	);
	if (error) {
		throw toResendFailureError(error);
	}
	if (!data?.id) {
		throw new Error("Resend returned no message id");
	}
	return { id: data.id };
}

// ==========================================
// 4. SES transport
// ==========================================
let sesClient: SESv2Client | null = null;

function sesCredentials():
	| { accessKeyId: string; secretAccessKey: string }
	| undefined {
	const accessKeyId = env.AWS_ACCESS_KEY_ID?.trim();
	const secretAccessKey = env.AWS_SECRET_ACCESS_KEY?.trim();
	if (accessKeyId && secretAccessKey) {
		return { accessKeyId, secretAccessKey };
	}
	return undefined;
}

function getSesClient(): SESv2Client {
	if (!sesClient) {
		const credentials = sesCredentials();
		sesClient = new SESv2Client({
			region: env.SES_REGION,
			...(credentials ? { credentials } : {}),
		});
	}
	return sesClient;
}

/** @internal Test-only reset. */
export function resetSesClientForTests(): void {
	sesClient = null;
}

export async function sendViaSes(msg: OutboundEmail): Promise<{ id: string }> {
	const from = msg.from?.trim() || sesFromAddress();
	const input: SendEmailCommandInput = {
		FromEmailAddress: from,
		Destination: { ToAddresses: [msg.to] },
		ReplyToAddresses: msg.replyTo ? [msg.replyTo] : undefined,
		Content: {
			Simple: {
				Subject: { Data: msg.subject, Charset: "UTF-8" },
				Body: {
					Html: { Data: msg.html, Charset: "UTF-8" },
					Text: { Data: msg.text, Charset: "UTF-8" },
				},
				Headers: [
					{
						Name: "X-Filosign-Idempotency-Key",
						Value: msg.idempotencyKey,
					},
				],
			},
		},
		...(env.SES_CONFIGURATION_SET?.trim()
			? { ConfigurationSetName: env.SES_CONFIGURATION_SET.trim() }
			: {}),
	};

	const result = await getSesClient().send(new SendEmailCommand(input));
	const id = result.MessageId;
	if (!id) {
		throw new Error("SES returned no message id");
	}
	return { id };
}

// ==========================================
// 5. Delivery orchestration
// ==========================================
function recipientFingerprint(to: string | string[]): string[] {
	const list = Array.isArray(to) ? to : [to];
	return list.map((entry) =>
		createHash("sha256").update(entry.trim().toLowerCase()).digest("hex"),
	);
}

function resolvePrimaryProvider(): EmailDeliveryProvider {
	const preferred = env.EMAIL_PROVIDER;
	if (preferred === "ses" && isSesDeliveryConfigured()) return "ses";
	if (preferred === "resend" && isResendDeliveryConfigured()) return "resend";
	if (isSesDeliveryConfigured()) return "ses";
	if (isResendDeliveryConfigured()) return "resend";
	throw new Error("No email delivery provider is configured");
}

function fallbackProvider(
	primary: EmailDeliveryProvider,
): EmailDeliveryProvider | null {
	if (primary === "ses" && isResendDeliveryConfigured()) return "resend";
	if (primary === "resend" && isSesDeliveryConfigured()) return "ses";
	return null;
}

async function sendWithProvider(
	provider: EmailDeliveryProvider,
	msg: OutboundEmail,
): Promise<{ id: string }> {
	if (provider === "ses") return sendViaSes(msg);
	return sendViaResend(msg);
}

function formatDeliveryError(
	primary: EmailDeliveryProvider,
	primaryError: unknown,
	fallback: EmailDeliveryProvider | null,
	fallbackError?: unknown,
): Error {
	const primaryLabel = primary === "ses" ? "SES" : "Resend";
	const primaryMsg =
		primaryError instanceof Error ? primaryError.message : String(primaryError);
	if (!fallback || fallbackError === undefined) {
		return primaryError instanceof Error ? primaryError : new Error(primaryMsg);
	}
	const fallbackLabel = fallback === "ses" ? "SES" : "Resend";
	const fallbackMsg =
		fallbackError instanceof Error
			? fallbackError.message
			: String(fallbackError);
	return new Error(
		`Email delivery failed (${primaryLabel}: ${primaryMsg}; ${fallbackLabel} fallback: ${fallbackMsg})`,
	);
}

function isRetryableForFallback(
	provider: EmailDeliveryProvider,
	error: unknown,
): boolean {
	if (provider === "ses") return isRetryableSesFailure(error);
	return isRetryableResendFailure(error);
}

/**
 * Primary: EMAIL_PROVIDER (SES or Resend). Fallback: the other provider on retryable failure.
 * All product email should call this (via invites.ts), not transports directly.
 */
export async function deliverOutboundEmail(
	msg: OutboundEmail,
): Promise<EmailDeliveryResult> {
	const outbound = outboundEmailDefaults(msg);
	const primary = resolvePrimaryProvider();
	const fallback = fallbackProvider(primary);

	const primaryRes = await tryCatch(sendWithProvider(primary, outbound));
	if (!primaryRes.error) {
		console.info("[email] sent", {
			provider: primary,
			id: primaryRes.data.id,
			recipientHashes: recipientFingerprint(outbound.to),
		});
		return { provider: primary, id: primaryRes.data.id };
	}

	const primaryError = primaryRes.error;
	if (!fallback || !isRetryableForFallback(primary, primaryError)) {
		throw formatDeliveryError(primary, primaryError, null);
	}

	console.warn(`[email] ${primary} failed; attempting ${fallback} fallback`, {
		recipientHashes: recipientFingerprint(outbound.to),
		error:
			primaryError instanceof Error
				? primaryError.message
				: String(primaryError),
	});

	const fallbackRes = await tryCatch(sendWithProvider(fallback, outbound));
	if (fallbackRes.error) {
		throw formatDeliveryError(
			primary,
			primaryError,
			fallback,
			fallbackRes.error,
		);
	}

	console.info("[email] sent", {
		provider: fallback,
		id: fallbackRes.data.id,
		recipientHashes: recipientFingerprint(outbound.to),
		fallback: true,
	});
	return { provider: fallback, id: fallbackRes.data.id };
}
