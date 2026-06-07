import type { ReactNode } from "react";

export type PartnerInviteCopyInput = {
	recipientName: string;
	planLabel: string;
	trialDays: number;
	workflowLabel?: string;
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

/** Subject uses raw recipient name (caller provides unescaped display name). */
export function partnerInviteSubject(recipientNameRaw: string): string {
	return `${recipientNameRaw}, your Filosign design partner invite`;
}

export function partnerInviteCopy(
	input: PartnerInviteCopyInput,
): PartnerInviteCopy {
	const { recipientName, trialDays } = input;

	return {
		subject: "",
		title: "Let's set up your pilot!",
		preheader: `I'll personally map one workflow for your team over the next ${trialDays} days.`,
		body: (
			<>
				Hey {recipientName}, Thank you for trying filosign!
				<br />
				<br />I am happy to guide you on setting up your first real workflow.
				Feel free to reply to this email with the thing that you're trying to
				achieve and I'll plan out your a step-by-step guide for you.
				<br />
				<br />
				Use the link below to sign up. It gives you {trialDays} days on our best
				plan!
			</>
		),
		ctaLabel: "Set up your account",
		signOff: "~ Kartik",
		footnote: "If you have any questions, reply to this email.",
	};
}
