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
	/** Pre-escaped custom middle paragraph */
	customMiddleParagraph?: string;
};

export default function PartnerInviteEmail({
	recipientName,
	planLabel,
	trialDays,
	ctaHref,
	customMiddleParagraph,
}: PartnerInviteEmailProps) {
	const copy = partnerInviteCopy({
		recipientName,
		planLabel,
		trialDays,
		customMiddleParagraph,
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
} satisfies PartnerInviteEmailProps;
