import { Text } from "@react-email/components";
import {
	type DocumentSharedContext,
	type DocumentSharedIntent,
	type DocumentSharedVariant,
	documentSharedCopy,
} from "../src/copy/document-shared";
import {
	documentSharedBodyClassName,
	resolveDocumentSharedTheme,
	resolveDocumentSharedThemeId,
} from "./_themes/resolve-document-shared-theme";

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

	const themeId = resolveDocumentSharedThemeId({ variant, intent, context });
	const Layout = resolveDocumentSharedTheme({ variant, intent, context });
	const bodyClassName = documentSharedBodyClassName(themeId);

	return (
		<Layout
			title={copy.title}
			preheader={copy.preheader}
			ctaHref={ctaHref}
			ctaLabel={copy.ctaLabel}
			disclaimer={disclaimer}
		>
			<Text className={bodyClassName}>{copy.body}</Text>
		</Layout>
	);
}

DocumentSharedEmail.PreviewProps = {
	senderLabel: "Alex Chen",
	ctaHref: "https://app.filosign.com/dashboard/document/sign?pieceCid=example",
	variant: "warm",
	intent: "initial",
	context: "sign",
} satisfies DocumentSharedEmailProps;
