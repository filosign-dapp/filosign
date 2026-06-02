import { renderDocumentShared } from "@filosign/emails";
import type { Address } from "viem";
import env from "@/env";
import { deliverOutboundEmail } from "./email";
import { buildEmailIdempotencyKey, escapeHtml, getClientUrl } from "./utils";

/**
 * All outbound product email is sent through this file (`deliverOutboundEmail`).
 * Transport: Resend primary, optional SES fallback — see `email.ts`.
 */
function shouldSkipEmail(): boolean {
	if (!env.RESEND_ENABLED) {
		console.info("[email] Skipping email send (RESEND_ENABLED=false)");
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

async function deliverEmail(args: {
	to: string;
	subject: string;
	text: string;
	html: string;
	idempotencySegments: string[];
}) {
	await deliverOutboundEmail({
		from: env.RESEND_FROM_EMAIL,
		to: args.to,
		subject: args.subject,
		text: args.text,
		html: args.html,
		replyTo: env.RESEND_FROM_EMAIL,
		idempotencyKey: buildEmailIdempotencyKey(args.idempotencySegments),
	});
}

export async function sendDocumentSharedEmail(args: {
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
	signUrl.searchParams.set("email", args.to.trim().toLowerCase());

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

export async function sendCheckoutContinueEmail(args: {
	to: string;
	continueUrl: string;
	planLabel: string;
}) {
	if (shouldSkipEmail()) return;

	const subject = `Complete your Filosign ${args.planLabel} purchase`;
	const text = [
		`Continue your Filosign ${args.planLabel} purchase:`,
		args.continueUrl,
		"",
		"This link expires in 24 hours.",
	].join("\n");

	const html = [
		`<p>Continue your Filosign ${escapeHtml(args.planLabel)} purchase:</p>`,
		`<p><a href="${escapeHtml(args.continueUrl)}">Continue to checkout</a></p>`,
		`<p style="color:#666;font-size:14px;">This link expires in 24 hours.</p>`,
	].join("");

	await deliverEmail({
		to: args.to,
		subject,
		text,
		html,
		idempotencySegments: [
			"checkout-continue",
			args.to.trim().toLowerCase(),
			args.continueUrl,
		],
	});
}

export async function sendPaidSetupEmail(args: {
	to: string;
	setupUrl: string;
	planLabel: string;
}) {
	if (shouldSkipEmail()) return;

	const subject = "Finish setting up Filosign";
	const text = [
		`Your ${args.planLabel} subscription is active.`,
		"",
		"Create your Filosign wallet to finish setup:",
		args.setupUrl,
		"",
		"If you already completed setup, you can sign in at the same link.",
	].join("\n");

	const html = [
		`<p>Your ${escapeHtml(args.planLabel)} subscription is active.</p>`,
		`<p><a href="${escapeHtml(args.setupUrl)}">Finish Filosign setup</a></p>`,
	].join("");

	await deliverEmail({
		to: args.to,
		subject,
		text,
		html,
		idempotencySegments: [
			"paid-setup",
			args.to.trim().toLowerCase(),
			args.setupUrl,
		],
	});
}

export async function sendAccessRequestApprovedEmail(args: {
	to: string;
	inviteUrl: string;
	planLabel: string;
	trialDays: number;
}) {
	if (shouldSkipEmail()) return;

	const subject = "Your Filosign access request was approved";
	const text = [
		"Your request for Filosign access was approved.",
		"",
		`Open the link below to start your ${args.trialDays}-day ${args.planLabel} trial:`,
		args.inviteUrl,
	].join("\n");

	const html = [
		"<p>Your request for Filosign access was approved.</p>",
		`<p><a href="${escapeHtml(args.inviteUrl)}">Start your Filosign trial</a></p>`,
		`<p style="color:#666;font-size:14px;">${escapeHtml(args.planLabel)} · ${args.trialDays}-day trial</p>`,
	].join("");

	await deliverEmail({
		to: args.to,
		subject,
		text,
		html,
		idempotencySegments: [
			"access-approved",
			args.to.trim().toLowerCase(),
			args.inviteUrl,
		],
	});
}

export async function sendDraftReviewInviteEmail(args: {
	to: string;
	senderWallet: Address;
	senderName?: string | null;
	draftId: string;
	draftTitle: string;
	inviteToken: string;
	accessKind: "warm" | "cold";
}) {
	const appUrl = getClientUrl();
	const reviewUrl = new URL("/draft/review", appUrl);
	reviewUrl.searchParams.set("token", args.inviteToken);

	await sendDocumentSharedEmail({
		to: args.to,
		senderWallet: args.senderWallet,
		pieceCid: args.draftId,
		senderName: args.senderName,
		variant: args.accessKind === "cold" ? "cold" : "warm",
		ctaHref: reviewUrl.toString(),
		idempotencyPrefix: "draft-review-invite",
		idempotencyExtra: [args.inviteToken, args.accessKind],
	});
}
