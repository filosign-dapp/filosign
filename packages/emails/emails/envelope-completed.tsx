import { Text } from "@react-email/components";
import { ArcaneLayout } from "./_themes/arcane/layout";

export type EnvelopeCompletedEmailProps = {
	/** Pre-escaped envelope display name */
	envelopeName: string;
	ctaHref: string;
};

export default function EnvelopeCompletedEmail({
	envelopeName,
	ctaHref,
}: EnvelopeCompletedEmailProps) {
	return (
		<ArcaneLayout
			title="Document completed"
			preheader="Everyone has signed. Download your completion packet."
			ctaHref={ctaHref}
			ctaLabel="Open completion packet"
		>
			<Text className="font-14 text-fg-2 m-0 max-w-[480px] font-sans leading-6">
				<strong>{envelopeName}</strong> is fully signed on Filosign. All
				required parties have signed. Download the completion packet for the
				original file, compliance report, and audit record.
			</Text>
		</ArcaneLayout>
	);
}

EnvelopeCompletedEmail.PreviewProps = {
	envelopeName: "Series A SAFE Agreement",
	ctaHref: "https://app.filosign.com/dashboard/document/sign?pieceCid=example",
} satisfies EnvelopeCompletedEmailProps;
