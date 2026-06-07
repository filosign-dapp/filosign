import { Text } from "@react-email/components";
import { BareboneLayout } from "./_themes/barebone/layout";

export type PaidSetupEmailProps = {
	/** Pre-escaped plan label */
	planLabel: string;
	ctaHref: string;
};

export default function PaidSetupEmail({
	planLabel,
	ctaHref,
}: PaidSetupEmailProps) {
	return (
		<BareboneLayout
			title="Finish setting up Filosign"
			preheader={`Your ${planLabel} subscription is active. Create your wallet to get started.`}
			ctaHref={ctaHref}
			ctaLabel="Finish setup"
		>
			<Text className="font-16 text-fg-2 mx-auto mt-0 mb-8 max-w-[480px] text-center font-sans leading-7">
				Your <strong>{planLabel}</strong> subscription is active. Create your
				Filosign wallet to start sending and signing documents. If you already
				completed setup, use the same link to sign in.
			</Text>
		</BareboneLayout>
	);
}

PaidSetupEmail.PreviewProps = {
	planLabel: "Teams Pro",
	ctaHref: "https://app.filosign.com/?setup=example",
} satisfies PaidSetupEmailProps;
