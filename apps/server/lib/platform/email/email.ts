import { createHash } from "node:crypto";
import {
	SESv2Client,
	SendEmailCommand,
	type SendEmailCommandInput,
} from "@aws-sdk/client-sesv2";
import { Resend } from "resend";
import env from "@/env";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import type { EmailDeliveryResult, OutboundEmail } from "./utils";

// ==========================================
// 1. SES Configurations
// ==========================================
export function isSesDeliveryConfigured(): boolean {
	if (!env.SES_ENABLED) return false;
	if (!env.SES_REGION?.trim()) return false;
	if (!env.SES_FROM_EMAIL?.trim()) return false;
	return true;
}

export function warnIfSesMisconfigured(): void {
	if (!env.SES_ENABLED) return;
	const missing: string[] = [];
	if (!env.SES_REGION?.trim()) missing.push("SES_REGION");
	if (!env.SES_FROM_EMAIL?.trim()) missing.push("SES_FROM_EMAIL");
	if (missing.length === 0) return;
	console.warn(
		`[email] SES_ENABLED=true but missing ${missing.join(", ")}; SES fallback is disabled until configured.`,
	);
}

// ==========================================
// 2. Resend Error Mapping & Classifier
// ==========================================
const RETRYABLE_HINTS = [
	"rate limit",
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
] as const;

export type ResendFailureLike = {
	statusCode?: number | null;
	message?: string;
	name?: string;
};

/** Classify Resend/API failures eligible for SES fallback (not validation 4xx). */
export function isRetryableResendFailure(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;
	const e = error as ResendFailureLike;
	if (typeof e.statusCode === "number") {
		if (e.statusCode === 429) return true;
		if (e.statusCode >= 500) return true;
		if (e.statusCode >= 400 && e.statusCode < 500) return false;
	}
	const text = [e.name, e.message]
		.filter((v): v is string => typeof v === "string")
		.join(" ")
		.toLowerCase();
	return RETRYABLE_HINTS.some((hint) => text.includes(hint));
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
// 3. Resend Transport Client
// ==========================================
let resendClient: Resend | null = null;

function getResendClient(): Resend {
	if (!resendClient) {
		resendClient = new Resend(env.RESEND_API_KEY);
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
// 4. SES Transport Client
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
	const from = env.SES_FROM_EMAIL?.trim();
	if (!from) {
		throw new Error("SES_FROM_EMAIL is not set");
	}
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
// 5. Consolidated Delivery Orchestration
// ==========================================
function outboundFromResendDefaults(msg: OutboundEmail): OutboundEmail {
	return {
		...msg,
		from: msg.from || env.RESEND_FROM_EMAIL,
		replyTo: msg.replyTo ?? env.RESEND_FROM_EMAIL,
	};
}

function recipientFingerprint(to: string | string[]): string[] {
	const list = Array.isArray(to) ? to : [to];
	return list.map((entry) =>
		createHash("sha256").update(entry.trim().toLowerCase()).digest("hex"),
	);
}

/**
 * Primary: Resend. Fallback: SES when configured and Resend failed retryably.
 * All product email should call this (via invites.ts), not transports directly.
 */
export async function deliverOutboundEmail(
	msg: OutboundEmail,
): Promise<EmailDeliveryResult> {
	const outbound = outboundFromResendDefaults(msg);

	const resendRes = await tryCatch(sendViaResend(outbound));
	if (!resendRes.error) {
		console.info("[email] sent", {
			provider: "resend",
			id: resendRes.data.id,
			recipientHashes: recipientFingerprint(outbound.to),
		});
		return { provider: "resend", id: resendRes.data.id };
	}

	const resendError = resendRes.error;
	if (!isRetryableResendFailure(resendError) || !isSesDeliveryConfigured()) {
		throw resendError;
	}

	console.warn("[email] Resend failed; attempting SES fallback", {
		recipientHashes: recipientFingerprint(outbound.to),
		error:
			resendError instanceof Error ? resendError.message : String(resendError),
	});

	const sesRes = await tryCatch(sendViaSes(outbound));
	if (sesRes.error) {
		const primary =
			resendError instanceof Error ? resendError.message : String(resendError);
		const secondary =
			sesRes.error instanceof Error
				? sesRes.error.message
				: String(sesRes.error);
		throw new Error(
			`Email delivery failed (Resend: ${primary}; SES fallback: ${secondary})`,
		);
	}

	console.info("[email] sent", {
		provider: "ses",
		id: sesRes.data.id,
		recipientHashes: recipientFingerprint(outbound.to),
		fallback: true,
	});
	return { provider: "ses", id: sesRes.data.id };
}
