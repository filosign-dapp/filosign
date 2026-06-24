import { Text } from "@react-email/components";
import {
	type SignerTurnVariant,
	signerTurnCopy,
} from "../src/copy/signer-turn";
import { ActivationLayout } from "./_themes/barebone/activation-layout";

export type { SignerTurnVariant } from "../src/copy/signer-turn";

export type SignerTurnEmailProps = {
	/** Pre-escaped sender display name */
	senderLabel: string;
	ctaHref: string;
	variant: SignerTurnVariant;
	/** Pre-escaped document title */
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

export default function SignerTurnEmail({
	senderLabel,
	ctaHref,
	variant,
	documentTitle,
}: SignerTurnEmailProps) {
	const copy = signerTurnCopy({
		senderLabel,
		variant,
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

SignerTurnEmail.PreviewProps = {
	senderLabel: "Alex Chen",
	ctaHref: "https://app.filosign.com/dashboard/document/sign?pieceCid=example",
	variant: "warm",
	documentTitle: "Q3 Vendor Agreement",
} satisfies SignerTurnEmailProps;
