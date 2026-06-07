import { Text } from "@react-email/components";
import {
	type DocumentSharedContext,
	type DocumentSharedIntent,
	type DocumentSharedVariant,
	documentSharedCopy,
} from "../src/copy/document-shared";
import { ActivationLayout } from "./_themes/barebone/activation-layout";

export type {
	DocumentSharedContext,
	DocumentSharedIntent,
	DocumentSharedVariant,
} from "../src/copy/document-shared";

export type DocumentSharedEmailProps = {
	/** Pre-escaped sender display name */
	senderLabel: string;
	ctaHref: string;
	variant: DocumentSharedVariant;
	intent?: DocumentSharedIntent;
	context?: DocumentSharedContext;
	/** Pre-escaped draft title for draft_review context */
	documentTitle?: string;
};

const disclaimer = (
	<>
		If you didn&apos;t request this,
		<br />
		please ignore this email.
	</>
);

const bodyClassName =
	"font-16 text-fg-2 mx-auto mt-0 mb-8 max-w-[380px] text-center font-sans";

export default function DocumentSharedEmail({
	senderLabel,
	ctaHref,
	variant,
	intent = "initial",
	context = "sign",
	documentTitle,
}: DocumentSharedEmailProps) {
	const copy = documentSharedCopy({
		senderLabel,
		variant,
		intent,
		context,
		documentTitle,
	});

	return (
		<ActivationLayout
			title={copy.title}
			preheader={copy.preheader}
			ctaHref={ctaHref}
			ctaLabel={copy.ctaLabel}
			disclaimer={disclaimer}
		>
			<Text className={bodyClassName}>{copy.body}</Text>
		</ActivationLayout>
	);
}

DocumentSharedEmail.PreviewProps = {
	senderLabel: "Alex Chen",
	ctaHref: "https://app.filosign.com/dashboard/document/sign?pieceCid=example",
	variant: "warm",
	intent: "initial",
	context: "sign",
} satisfies DocumentSharedEmailProps;
