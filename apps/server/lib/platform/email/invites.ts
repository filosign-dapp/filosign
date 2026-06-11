import {
	documentSharedSubject,
	type FilosignTransactionalEmailKind,
	partnerInviteSubject,
	renderAccessRequestApproved,
	renderCheckoutContinue,
	renderDocumentShared,
	renderEnvelopeCompleted,
	renderPaidSetup,
	renderPartnerInvite,
	replyToForTransactionalEmail,
} from "@filosign/emails";
import type { Address } from "viem";
import env from "@/env";
import { deliverOutboundEmail } from "./email";
import { recipientDisplayNameFromEmail } from "./recipient-name";
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
	documentTitle?: string | null;
	intent?: "initial" | "reminder";
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
	kind: FilosignTransactionalEmailKind;
}) {
	await deliverOutboundEmail({
		from: env.RESEND_FROM_EMAIL,
		to: args.to,
		subject: args.subject,
		text: args.text,
		html: args.html,
		replyTo: replyToForTransactionalEmail(args.kind),
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
	intent?: "initial" | "reminder";
	context?: "sign" | "draft_review";
	documentTitle?: string | null;
}) {
	if (shouldSkipEmail()) return;

	const senderLabel =
		args.senderName?.trim() || formatAddress(args.senderWallet);
	const escapedSenderLabel = escapeHtml(senderLabel);
	const intent = args.intent ?? "initial";
	const context = args.context ?? "sign";
	const escapedDocumentTitle = args.documentTitle?.trim()
		? escapeHtml(args.documentTitle.trim())
		: undefined;

	const subject = documentSharedSubject({
		senderLabel: escapedSenderLabel,
		senderLabelRaw: senderLabel,
		variant: args.variant,
		intent,
		context,
		documentTitle: escapedDocumentTitle,
	});

	const { html, text } = await renderDocumentShared({
		senderLabel: escapedSenderLabel,
		ctaHref: args.ctaHref,
		variant: args.variant,
		intent,
		context,
		documentTitle: escapedDocumentTitle,
	});

	await deliverEmail({
		to: args.to,
		subject,
		text,
		html,
		kind: "document",
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
		documentTitle: args.documentTitle,
		variant: "cold",
		ctaHref: signUrl.toString(),
		idempotencyPrefix: "cold-doc-invite",
		idempotencyExtra: [args.inviteToken],
		intent: args.intent,
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
		documentTitle: args.documentTitle,
		variant: "warm",
		ctaHref: documentUrl,
		idempotencyPrefix: "doc-received",
		intent: args.intent,
	});
}

export async function sendEnvelopeCompletedEmail(args: {
	to: string;
	senderWallet: Address;
	pieceCid: string;
	senderName?: string | null;
	envelopeName: string;
}) {
	if (shouldSkipEmail()) return;

	const appUrl = getClientUrl();
	const downloadUrl = `${appUrl}/dashboard/document/sign?pieceCid=${encodeURIComponent(args.pieceCid)}`;
	const escapedEnvelopeName = escapeHtml(args.envelopeName);
	const subject = `Completed: ${args.envelopeName}`;

	const { html, text } = await renderEnvelopeCompleted({
		envelopeName: escapedEnvelopeName,
		ctaHref: downloadUrl,
	});

	await deliverEmail({
		to: args.to,
		subject,
		text,
		html,
		kind: "envelope_completed",
		idempotencySegments: [
			"envelope-completed",
			args.to.trim().toLowerCase(),
			args.pieceCid,
		],
	});
}

export async function sendCheckoutContinueEmail(args: {
	to: string;
	continueUrl: string;
	planLabel: string;
}) {
	if (shouldSkipEmail()) return;

	const escapedPlanLabel = escapeHtml(args.planLabel);
	const subject = `Complete your Filosign ${args.planLabel} purchase`;

	const { html, text } = await renderCheckoutContinue({
		planLabel: escapedPlanLabel,
		ctaHref: args.continueUrl,
	});

	await deliverEmail({
		to: args.to,
		subject,
		text,
		html,
		kind: "checkout_continue",
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

	const escapedPlanLabel = escapeHtml(args.planLabel);
	const subject = "Finish setting up Filosign";

	const { html, text } = await renderPaidSetup({
		planLabel: escapedPlanLabel,
		ctaHref: args.setupUrl,
	});

	await deliverEmail({
		to: args.to,
		subject,
		text,
		html,
		kind: "paid_setup",
		idempotencySegments: [
			"paid-setup",
			args.to.trim().toLowerCase(),
			args.setupUrl,
		],
	});
}

export async function sendPartnerInviteEmail(args: {
	to: string;
	inviteUrl: string;
	planLabel: string;
	trialDays: number;
	workflowLabel?: string | null;
}) {
	if (shouldSkipEmail()) return;

	const email = args.to.trim().toLowerCase();
	const recipientNameRaw = recipientDisplayNameFromEmail(email);
	const escapedRecipientName = escapeHtml(recipientNameRaw);
	const escapedPlanLabel = escapeHtml(args.planLabel);
	const escapedWorkflowLabel = args.workflowLabel?.trim()
		? escapeHtml(args.workflowLabel.trim())
		: undefined;

	const subject = partnerInviteSubject(recipientNameRaw);

	const { html, text } = await renderPartnerInvite({
		recipientName: escapedRecipientName,
		planLabel: escapedPlanLabel,
		trialDays: args.trialDays,
		ctaHref: args.inviteUrl,
		workflowLabel: escapedWorkflowLabel,
	});

	await deliverEmail({
		to: email,
		subject,
		text,
		html,
		kind: "partner_invite",
		idempotencySegments: [
			"partner-invite",
			email,
			args.inviteUrl,
			escapedWorkflowLabel ?? "",
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

	const escapedPlanLabel = escapeHtml(args.planLabel);
	const subject = "Your Filosign access request was approved";

	const { html, text } = await renderAccessRequestApproved({
		planLabel: escapedPlanLabel,
		trialDays: args.trialDays,
		ctaHref: args.inviteUrl,
	});

	await deliverEmail({
		to: args.to,
		subject,
		text,
		html,
		kind: "access_approved",
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
		context: "draft_review",
		documentTitle: args.draftTitle,
	});
}
