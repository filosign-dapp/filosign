import type { ReactNode } from "react";

export type SignerTurnVariant = "warm" | "cold";

export type SignerTurnCopyInput = {
	senderLabel: string;
	documentTitle?: string;
	variant: SignerTurnVariant;
};

export type SignerTurnCopy = {
	subject: string;
	title: string;
	preheader: string;
	body: ReactNode;
	ctaLabel: string;
};

function documentTitleFragment(
	documentTitle: string | undefined,
	fallback: string,
): ReactNode {
	return documentTitle ? (
		<>
			{" "}
			<strong>{documentTitle}</strong>
		</>
	) : (
		` ${fallback}`
	);
}

const coldAccessCodeNote = (
	<>
		This document requires a secure access code. Open the link below, then enter
		the code the sender shares with you separately (not in this email).
	</>
);

/** Subject line uses unescaped sender label (caller provides raw display name). */
export function signerTurnSubject(input: { senderLabelRaw: string }): string {
	return `${input.senderLabelRaw} is ready for your signature`;
}

export function signerTurnCopy(input: SignerTurnCopyInput): SignerTurnCopy {
	const { senderLabel, documentTitle, variant } = input;

	const body = (
		<>
			<strong>{senderLabel}</strong> is ready for your signature on
			{documentTitleFragment(documentTitle, "a document")}. Prior signers have
			completed their step. Open the document below to review and sign.
			{variant === "cold" ? (
				<>
					<br />
					<br />
					{coldAccessCodeNote}
				</>
			) : null}
		</>
	);

	return {
		subject: "",
		title: "It's your turn to sign",
		preheader:
			variant === "cold"
				? "Your signature is needed next. You will need the access code from the sender."
				: "Prior signers have finished. Review and sign on Filosign.",
		body,
		ctaLabel: "Sign now",
	};
}
