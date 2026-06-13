import type { PaidCheckoutPlanId } from "@filosign/shared";
import { Text } from "@react-email/components";
import { paidSetupHeroForPlan } from "../src/email-assets";
import { WelcomeLayout } from "./_themes/barebone/welcome-layout";

export type PaidSetupEmailProps = {
	/** Pre-escaped plan label */
	planLabel: string;
	planId: PaidCheckoutPlanId;
	ctaHref: string;
};

export default function PaidSetupEmail({
	planLabel,
	planId,
	ctaHref,
}: PaidSetupEmailProps) {
	return (
		<WelcomeLayout
			title="Finish setting up"
			preheader={`Your ${planLabel} subscription is active. Finish setting up your account to get started.`}
			ctaHref={ctaHref}
			ctaLabel="Finish account setup"
			contactChannel="hello"
			heroImage={paidSetupHeroForPlan(planId)}
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
	planId: "teams_pro",
	ctaHref: "https://app.filosign.xyz/?setup=example",
} satisfies PaidSetupEmailProps;
