import { Text } from "@react-email/components";
import { filosignEmailAssets } from "../src/email-assets";
import { WelcomeLayout } from "./_themes/barebone/welcome-layout";

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
		<WelcomeLayout
			title="Finish setting up Filosign"
			preheader={`Your ${planLabel} subscription is active. Finish setting up your account to get started.`}
			ctaHref={ctaHref}
			ctaLabel="Finish account setup"
			contactChannel="hello"
			heroImage={filosignEmailAssets.barebone.paidSetupHero}
		>
			<Text className="font-16 text-fg-2 m-0 font-sans">
				Your <strong>{planLabel}</strong> subscription is active. Finish setting
				up your Filosign account to start sending and signing documents.
			</Text>
		</WelcomeLayout>
	);
}

PaidSetupEmail.PreviewProps = {
	planLabel: "Teams Pro",
	ctaHref: "https://app.filosign.com/?setup=example",
} satisfies PaidSetupEmailProps;
