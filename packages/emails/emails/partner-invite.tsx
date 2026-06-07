import { Text } from "@react-email/components";
import { partnerInviteCopy } from "../src/copy/partner-invite";
import { filosignEmailAssets } from "../src/email-assets";
import { WelcomeLayout } from "./_themes/barebone/welcome-layout";

export type PartnerInviteEmailProps = {
	/** Pre-escaped recipient display name */
	recipientName: string;
	/** Pre-escaped plan label */
	planLabel: string;
	trialDays: number;
	ctaHref: string;
	/** Pre-escaped pilot workflow name (e.g. from platform_invites.note) */
	workflowLabel?: string;
	/** Pre-escaped optional founder note shown below the body */
	personalMessage?: string;
};

export default function PartnerInviteEmail({
	recipientName,
	planLabel,
	trialDays,
	ctaHref,
	workflowLabel,
	personalMessage,
}: PartnerInviteEmailProps) {
	const copy = partnerInviteCopy({
		recipientName,
		planLabel,
		trialDays,
		workflowLabel,
	});

	return (
		<WelcomeLayout
			title={copy.title}
			preheader={copy.preheader}
			ctaHref={ctaHref}
			ctaLabel={copy.ctaLabel}
			footnote={copy.footnote}
			contactChannel="founder"
			heroImage={filosignEmailAssets.barebone.partnerInviteHero}
		>
			<Text className="font-16 text-fg-2 m-0 font-sans">{copy.body}</Text>
			{personalMessage ? (
				<Text className="font-16 text-fg-2 border-stroke mx-auto mt-6 mb-0 max-w-[380px] border-l-2 pl-4 text-left font-sans leading-6 italic">
					{personalMessage}
				</Text>
			) : null}
			<Text className="font-16 text-fg-2 mt-6 mb-0 font-sans">
				{copy.signOff}
			</Text>
		</WelcomeLayout>
	);
}

PartnerInviteEmail.PreviewProps = {
	recipientName: "Jordan Lee",
	planLabel: "Teams Pro",
	trialDays: 30,
	ctaHref: "https://app.filosign.com/?platformInvite=example",
	workflowLabel: "milestone approval before contributor release",
	personalMessage: "",
} satisfies PartnerInviteEmailProps;
