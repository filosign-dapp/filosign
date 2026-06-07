import { Section, Text } from "@react-email/components";
import { MatteLayout } from "./_themes/matte/layout";

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
		<MatteLayout
			title="Complete your purchase"
			preheader="Your checkout link is ready. It expires in 24 hours."
			ctaHref={ctaHref}
			ctaLabel="Continue to checkout"
			footnote="This link expires in 24 hours."
			disclaimer={
				<>
					If you did not request this,
					<br />
					you can ignore this email.
				</>
			}
		>
			<Text className="font-14 text-fg-2 m-0 max-w-[480px] font-sans leading-6">
				You started a Filosign subscription. Use the button below to finish
				checkout.
			</Text>

			<Section className="border-stroke mt-6 border-t pt-6">
				<Text className="font-11 text-fg-3 m-0 font-sans uppercase tracking-wide">
					Plan
				</Text>
				<Text className="font-20 text-fg m-0 mt-1 font-sans">{planLabel}</Text>
			</Section>
		</MatteLayout>
	);
}

CheckoutContinueEmail.PreviewProps = {
	planLabel: "Teams Pro",
	ctaHref: "https://api.filosign.com/checkout/continue?token=example",
} satisfies CheckoutContinueEmailProps;
