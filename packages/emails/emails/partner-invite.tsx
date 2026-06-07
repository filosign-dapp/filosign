import { Text } from "@react-email/components";
import { ArcaneLayout } from "./_themes/arcane/layout";

export type PartnerInviteEmailProps = {
	/** Pre-escaped recipient display name */
	recipientName: string;
	/** Pre-escaped plan label */
	planLabel: string;
	trialDays: number;
	ctaHref: string;
	/** Pre-escaped optional personal message from the Filosign team */
	personalMessage?: string;
};

export default function PartnerInviteEmail({
	recipientName,
	planLabel,
	trialDays,
	ctaHref,
	personalMessage,
}: PartnerInviteEmailProps) {
	const title = "You're invited to Filosign";
	const preheader = `Start your ${trialDays}-day ${planLabel} trial.`;

	return (
		<ArcaneLayout
			title={title}
			preheader={preheader}
			ctaHref={ctaHref}
			ctaLabel="Start your trial"
			disclaimer={
				<>
					If you weren&apos;t expecting this invite,
					<br />
					you can ignore this email.
				</>
			}
		>
			<Text className="font-14 text-fg-2 m-0 max-w-[480px] font-sans leading-6">
				Hi <strong>{recipientName}</strong>, you&apos;ve been invited to try
				Filosign on <strong>{planLabel}</strong> for {trialDays} days.
			</Text>
			{personalMessage ? (
				<Text className="font-14 text-fg-2 border-stroke m-0 mt-6 max-w-[480px] border-l-2 pl-4 font-serif leading-7 italic">
					{personalMessage}
				</Text>
			) : null}
			<Text className="font-14 text-fg-3 m-0 mt-6 max-w-[480px] font-sans leading-6">
				Use the link below to create your account and open your workspace.
			</Text>
		</ArcaneLayout>
	);
}

PartnerInviteEmail.PreviewProps = {
	recipientName: "Jordan Lee",
	planLabel: "Teams Pro",
	trialDays: 30,
	ctaHref: "https://app.filosign.com/?platformInvite=example",
	personalMessage:
		"We loved your application and would like you to try Filosign.",
} satisfies PartnerInviteEmailProps;
