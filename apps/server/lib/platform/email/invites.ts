import { createHash } from "node:crypto";
import { renderDocumentShared } from "@filosign/emails";
import { Resend } from "resend";
import type { Address } from "viem";
import env from "@/env";
import { escapeHtml } from "./html";
import { getClientUrl } from "./public-url";

/**
 * All outbound product email is sent through this file (Resend). There are no
 * other `resend.emails.send` call sites in `apps/server` or packages.
 */
function shouldSkipEmail(): boolean {
	if (env.DEBUG) {
		console.log("[DEBUG] Skipping email send (DEBUG mode is enabled)");
		return true;
	}
	return false;
}

function formatAddress(address: Address) {
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

type SendDocumentEmailBaseArgs = {
	to: string;
	senderWallet: Address;
	pieceCid: string;
	senderName?: string | null;
};

type SendColdDocumentInviteEmailArgs = SendDocumentEmailBaseArgs & {
	inviteToken: string;
};

type SendDocumentReceivedEmailArgs = SendDocumentEmailBaseArgs;

const resend = new Resend(env.RESEND_API_KEY);

function idempotencyKey(parts: string[]): string {
	return createHash("sha256")
		.update(parts.join("\0"))
		.digest("hex")
		.slice(0, 240);
}

async function deliverEmail(args: {
	to: string;
	subject: string;
	text: string;
	html: string;
	idempotencySegments: string[];
}) {
	const { data, error } = await resend.emails.send(
		{
			from: env.RESEND_FROM_EMAIL,
			to: args.to,
			subject: args.subject,
			text: args.text,
			html: args.html,
			replyTo: env.RESEND_FROM_EMAIL,
		},
		{
			headers: {
				"Idempotency-Key": idempotencyKey(args.idempotencySegments),
			},
		},
	);
	if (error) {
		throw new Error(error.message);
	}
	if (data?.id) {
		console.info("[email] resend sent", { id: data.id, to: args.to });
	}
}

async function sendDocumentSharedEmail(args: {
	to: string;
	senderWallet: Address;
	pieceCid: string;
	senderName?: string | null;
	variant: "warm" | "cold";
	ctaHref: string;
	idempotencyPrefix: string;
	idempotencyExtra?: string[];
}) {
	if (shouldSkipEmail()) return;

	const senderLabel =
		args.senderName?.trim() || formatAddress(args.senderWallet);
	const escapedSenderLabel = escapeHtml(senderLabel);
	const subject = `${senderLabel} sent you a document`;

	const { html, text: renderedText } = await renderDocumentShared({
		senderLabel: escapedSenderLabel,
		ctaHref: args.ctaHref,
		variant: args.variant,
	});

	const text =
		args.variant === "cold"
			? [
					`${senderLabel} shared a document with you on Filosign.`,
					"",
					"Open the link to view or sign. They should give you a six-word passphrase separately (not in this email):",
					args.ctaHref,
				].join("\n")
			: [
					`${senderLabel} sent you a document on Filosign.`,
					"",
					"Sign in to view, sign, or download:",
					args.ctaHref,
				].join("\n");

	await deliverEmail({
		to: args.to,
		subject,
		text: renderedText.trim() ? renderedText : text,
		html,
		idempotencySegments: [
			args.idempotencyPrefix,
			args.to.trim().toLowerCase(),
			args.pieceCid,
			args.senderWallet.toLowerCase(),
			...(args.idempotencyExtra ?? []),
		],
	});
}

export async function sendColdDocumentInviteEmail(
	args: SendColdDocumentInviteEmailArgs,
) {
	const appUrl = getClientUrl();
	const signUrl = new URL("/", appUrl);
	signUrl.searchParams.set("coldPieceCid", args.pieceCid);
	signUrl.searchParams.set("coldInvite", args.inviteToken);

	await sendDocumentSharedEmail({
		to: args.to,
		senderWallet: args.senderWallet,
		pieceCid: args.pieceCid,
		senderName: args.senderName,
		variant: "cold",
		ctaHref: signUrl.toString(),
		idempotencyPrefix: "cold-doc-invite",
		idempotencyExtra: [args.inviteToken],
	});
}

export async function sendDocumentReceivedEmail(
	args: SendDocumentReceivedEmailArgs,
) {
	const appUrl = getClientUrl();
	const documentUrl = `${appUrl}/dashboard/document/sign?pieceCid=${encodeURIComponent(args.pieceCid)}`;

	await sendDocumentSharedEmail({
		to: args.to,
		senderWallet: args.senderWallet,
		pieceCid: args.pieceCid,
		senderName: args.senderName,
		variant: "warm",
		ctaHref: documentUrl,
		idempotencyPrefix: "doc-received",
	});
}
