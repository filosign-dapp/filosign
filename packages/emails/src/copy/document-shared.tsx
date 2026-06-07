import type { ReactNode } from "react";

export type DocumentSharedVariant = "warm" | "cold";
export type DocumentSharedIntent = "initial" | "reminder";
export type DocumentSharedContext = "sign" | "draft_review";

export type DocumentSharedCopyInput = {
	senderLabel: string;
	variant: DocumentSharedVariant;
	intent: DocumentSharedIntent;
	context: DocumentSharedContext;
	documentTitle?: string;
};

export type DocumentSharedCopy = {
	subject: string;
	title: string;
	preheader: string;
	body: ReactNode;
	ctaLabel: string;
};

const coldAccessCodeNote = (
	<>
		This document requires a secure access code. Open the link below, then enter
		the code the sender shares with you separately (not in this email).
	</>
);

function draftReviewBody(
	senderLabel: string,
	documentTitle: string | undefined,
	variant: DocumentSharedVariant,
): ReactNode {
	const titleFragment = documentTitle ? (
		<>
			{" "}
			<strong>{documentTitle}</strong>
		</>
	) : (
		" a draft"
	);

	return (
		<>
			<strong>{senderLabel}</strong> shared
			{titleFragment} for your review on Filosign. Sign in with this email to
			view the draft and leave feedback.
			{variant === "cold" ? (
				<>
					<br />
					<br />
					{coldAccessCodeNote}
				</>
			) : null}
		</>
	);
}

function signWarmBody(
	senderLabel: string,
	intent: DocumentSharedIntent,
): ReactNode {
	if (intent === "reminder") {
		return (
			<>
				<strong>{senderLabel}</strong> is waiting for your signature. Open the
				document below to review and sign.
			</>
		);
	}

	return (
		<>
			<strong>{senderLabel}</strong> shared a document with you on Filosign.
			Sign in with this email to review, sign, or download.
		</>
	);
}

function signColdBody(
	senderLabel: string,
	intent: DocumentSharedIntent,
): ReactNode {
	const intro =
		intent === "reminder" ? (
			<>
				<strong>{senderLabel}</strong> is waiting for your signature.
			</>
		) : (
			<>
				<strong>{senderLabel}</strong> shared a document with you on Filosign.
			</>
		);

	return (
		<>
			{intro} This document requires a secure access code. Open the link below,
			then enter the code the sender shares with you separately (not in this
			email).
		</>
	);
}

/** Subject line uses unescaped sender label (caller provides raw display name). */
export function documentSharedSubject(
	input: DocumentSharedCopyInput & { senderLabelRaw: string },
): string {
	const { senderLabelRaw, variant, intent, context } = input;

	if (context === "draft_review") {
		return `${senderLabelRaw} invited you to review a draft`;
	}

	if (intent === "reminder") {
		return variant === "cold"
			? `Reminder: ${senderLabelRaw} is waiting for your signature`
			: `Reminder: signature needed from ${senderLabelRaw}`;
	}

	return `${senderLabelRaw} sent you a document`;
}

export function documentSharedCopy(
	input: DocumentSharedCopyInput,
): DocumentSharedCopy {
	const { senderLabel, variant, intent, context, documentTitle } = input;

	if (context === "draft_review") {
		return {
			subject: "",
			title: "Review a draft",
			preheader:
				variant === "cold"
					? "Secure access required. Open the link, then enter the code from the sender."
					: "Review and comment before the document is sent for signature.",
			body: draftReviewBody(senderLabel, documentTitle, variant),
			ctaLabel: "Review draft",
		};
	}

	if (variant === "cold") {
		return {
			subject: "",
			title:
				intent === "reminder"
					? "Signature reminder"
					: "You have a new document",
			preheader:
				intent === "reminder"
					? "Your signature is still needed. You will need the access code from the sender."
					: "Secure access required. Open the link, then enter the code from the sender.",
			body: signColdBody(senderLabel, intent),
			ctaLabel: "Open document",
		};
	}

	return {
		subject: "",
		title:
			intent === "reminder" ? "Signature reminder" : "You have a new document",
		preheader:
			intent === "reminder"
				? "Your signature is still needed on a Filosign document."
				: "Sign in with this email to open it on Filosign.",
		body: signWarmBody(senderLabel, intent),
		ctaLabel: "Open document",
	};
}
