import { Fragment, type ReactNode } from "react";

export const PARTNER_INVITE_DEFAULT_MIDDLE =
	"Glad to have you on board! I would personally love to get you started with your first workflow. Just let me know what is your primary goal and I will outline a customized guide for you.";

export type PartnerInviteCopyInput = {
	recipientName: string;
	planLabel: string;
	trialDays: number;
	/** Pre-escaped custom middle paragraph; replaces default when set */
	customMiddleParagraph?: string;
};

export type PartnerInviteCopy = {
	subject: string;
	title: string;
	preheader: string;
	body: ReactNode;
	ctaLabel: string;
	signOff: string;
	footnote?: ReactNode;
};

function escapedParagraphLines(escaped: string): ReactNode {
	const lines = escaped.split("\n");
	return lines.map((line, index) => (
		<Fragment key={`line-${index}`}>
			{index > 0 ? <br /> : null}
			{line}
		</Fragment>
	));
}

/** Subject uses raw recipient name (caller provides unescaped display name). */
export function partnerInviteSubject(_recipientNameRaw: string): string {
	return `Your filosign pilot is here.`;
}

export function partnerInviteCopy(
	input: PartnerInviteCopyInput,
): PartnerInviteCopy {
	const { recipientName, trialDays, customMiddleParagraph } = input;

	const middleParagraph = customMiddleParagraph
		? escapedParagraphLines(customMiddleParagraph)
		: PARTNER_INVITE_DEFAULT_MIDDLE;

	return {
		subject: "",
		title: "Let's get you set up!",
		preheader: `I'll personally map one workflow for your team over the next ${trialDays} days.`,
		body: (
			<>
				Hey {recipientName}, Welcome to filosign!
				<br />
				<br />
				{middleParagraph}
				<br />
				<br />
				Use the link below to sign up. It gives you {trialDays} days on our best
				plan!
			</>
		),
		ctaLabel: "Set up your account",
		signOff: "Best regards, Kartik",
		footnote: "Feel free to reply to this email with any questions you have.",
	};
}
