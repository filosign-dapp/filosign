import { Text } from "@react-email/components";
import { ActivationLayout } from "./_themes/barebone/activation-layout";

export type AccessRequestApprovedEmailProps = {
	/** Pre-escaped plan label */
	planLabel: string;
	trialDays: number;
	ctaHref: string;
};

export default function AccessRequestApprovedEmail({
	planLabel,
	trialDays,
	ctaHref,
}: AccessRequestApprovedEmailProps) {
	return (
		<ActivationLayout
			title="Access approved"
			preheader={`Your ${trialDays}-day ${planLabel} trial is ready. Set up your account to get started.`}
			ctaHref={ctaHref}
			ctaLabel="Set up your account"
			contactChannel="hello"
		>
			<Text className="font-16 text-fg-2 mx-auto mt-0 mb-8 max-w-[380px] text-center font-sans">
				Your request for Filosign access was approved. Set up your account below
				to start your {trialDays}-day <strong>{planLabel}</strong> trial.
			</Text>
		</ActivationLayout>
	);
}

AccessRequestApprovedEmail.PreviewProps = {
	planLabel: "Teams Pro",
	trialDays: 30,
	ctaHref: "https://app.filosign.com/?platformInvite=example",
} satisfies AccessRequestApprovedEmailProps;
