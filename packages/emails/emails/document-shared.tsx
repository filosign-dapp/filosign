import { Text } from "@react-email/components";
import { FilosignLayout } from "./_components/FilosignLayout";

export type DocumentSharedVariant = "warm" | "cold";

export type DocumentSharedEmailProps = {
	/** Pre-escaped sender display name */
	senderLabel: string;
	ctaHref: string;
	variant: DocumentSharedVariant;
};

const disclaimer = (
	<>
		If you didn&apos;t request this,
		<br />
		please ignore this email.
	</>
);

function copyForVariant(variant: DocumentSharedVariant, senderLabel: string) {
	const title = "You have a new document";
	const body = (
		<>
			<strong>{senderLabel}</strong> sent you a document on Filosign. Click the
			button below to review it.
		</>
	);

	if (variant === "cold") {
		return {
			title,
			preheader: `${senderLabel} sent you a document on Filosign. This document is password protected.`,
			body: (
				<>
					{body}
					<br />
					<br />
					This document is password protected. You'll need the secret code from
					the sender to open it.
				</>
			),
		};
	}

	return {
		title,
		preheader: `${senderLabel} sent you a document on Filosign. Sign in with this email to open it.`,
		body,
	};
}

export default function DocumentSharedEmail({
	senderLabel,
	ctaHref,
	variant,
}: DocumentSharedEmailProps) {
	const copy = copyForVariant(variant, senderLabel);

	return (
		<FilosignLayout
			title={copy.title}
			preheader={copy.preheader}
			ctaHref={ctaHref}
			ctaLabel="Open document"
			disclaimer={disclaimer}
		>
			<Text className="font-16 text-fg-2 mx-auto mt-0 mb-8 max-w-[380px] text-center font-sans">
				{copy.body}
			</Text>
		</FilosignLayout>
	);
}

DocumentSharedEmail.PreviewProps = {
	senderLabel: "Alex Chen",
	ctaHref: "https://app.filosign.com/dashboard/document/sign?pieceCid=example",
	variant: "warm",
} satisfies DocumentSharedEmailProps;
