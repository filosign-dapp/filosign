import { Text } from "@react-email/components";
import { SubscriptionConfirmationLayout } from "./_themes/barebone/subscription-confirmation-layout";

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
		<SubscriptionConfirmationLayout
			title="Document completed"
			preheader="Everyone has signed. Download your completion packet."
			ctaHref={ctaHref}
			ctaLabel="Open completion packet"
			summaryRow={
				<>
					<Text className="font-13 text-fg-3 m-0 font-sans uppercase tracking-wide">
						Envelope
					</Text>
					<Text className="font-24 text-fg m-0 mt-1 font-sans">
						{envelopeName}
					</Text>
				</>
			}
		>
			<Text className="font-16 text-fg-2 mx-auto mt-0 mb-8 max-w-[380px] text-center font-sans">
				<strong>{envelopeName}</strong> is fully signed on Filosign. All
				required parties have signed. Download the completion packet for the
				original file, compliance report, and audit record.
			</Text>
		</SubscriptionConfirmationLayout>
	);
}

EnvelopeCompletedEmail.PreviewProps = {
	envelopeName: "Series A SAFE Agreement",
	ctaHref: "https://app.filosign.com/dashboard/document/sign?pieceCid=example",
} satisfies EnvelopeCompletedEmailProps;
