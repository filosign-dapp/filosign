import { Text } from "@react-email/components";
import { StudioLayout } from "./_themes/studio/layout";

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
		<StudioLayout
			title="Access approved"
			preheader={`Start your ${trialDays}-day ${planLabel} trial on Filosign.`}
			ctaHref={ctaHref}
			ctaLabel="Start your trial"
		>
			<Text className="font-14 text-fg-2 m-0 max-w-[480px] font-sans leading-6">
				Your request for Filosign access was approved. Open the link below to
				start your {trialDays}-day <strong>{planLabel}</strong> trial.
			</Text>
		</StudioLayout>
	);
}

AccessRequestApprovedEmail.PreviewProps = {
	planLabel: "Teams Pro",
	trialDays: 30,
	ctaHref: "https://app.filosign.com/?platformInvite=example",
} satisfies AccessRequestApprovedEmailProps;
