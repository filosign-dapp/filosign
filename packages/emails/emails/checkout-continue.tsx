import { Text } from "@react-email/components";
import { SubscriptionConfirmationLayout } from "./_themes/barebone/subscription-confirmation-layout";

export type CheckoutContinueEmailProps = {
	/** Pre-escaped plan label */
	planLabel: string;
	ctaHref: string;
};

export default function CheckoutContinueEmail({
	planLabel,
	ctaHref,
}: CheckoutContinueEmailProps) {
	return (
		<SubscriptionConfirmationLayout
			title="Complete your purchase"
			preheader="Your checkout link is ready. It expires in 24 hours."
			ctaHref={ctaHref}
			ctaLabel="Continue to checkout"
			contactChannel="hello"
			footnote="This link expires in 24 hours."
			summaryRow={
				<>
					<Text className="font-13 text-fg-3 m-0 font-sans uppercase tracking-wide">
						Plan
					</Text>
					<Text className="font-24 text-fg m-0 mt-1 font-sans">
						{planLabel}
					</Text>
				</>
			}
			disclaimer={
				<>
					If you did not request this,
					<br />
					you can ignore this email.
				</>
			}
		>
			<Text className="font-16 text-fg-2 mx-auto mt-0 mb-8 max-w-[380px] text-center font-sans">
				You started a Filosign subscription. Use the button below to finish
				checkout.
			</Text>
		</SubscriptionConfirmationLayout>
	);
}

CheckoutContinueEmail.PreviewProps = {
	planLabel: "Teams Pro",
	ctaHref: "https://api.filosign.com/checkout/continue?token=example",
} satisfies CheckoutContinueEmailProps;
