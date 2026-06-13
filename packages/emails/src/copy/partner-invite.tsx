import type { PlatformInviteEmailVariant } from "@filosign/shared";
import { Fragment, type ReactNode } from "react";
import { filosignContactEmail } from "../contact-emails";

export type PartnerInviteEmailVariant = PlatformInviteEmailVariant;

export const PARTNER_INVITE_WARM_MIDDLE =
	"Glad to have you on board! I would personally love to get you started with your first workflow. Just let me know what is your primary goal and I will outline a customized guide for you.";

export const PARTNER_INVITE_COLD_MIDDLE =
	"You are invited to try filosign as a design partner. This is a personal invite, not from a waitlist or signup form. If it resonates, use the link below to create your account and explore the product on our best plan.";

/** @deprecated Use PARTNER_INVITE_WARM_MIDDLE */
export const PARTNER_INVITE_DEFAULT_MIDDLE = PARTNER_INVITE_WARM_MIDDLE;

export type PartnerInviteCopyInput = {
	recipientName: string;
	planLabel: string;
	trialDays: number;
	variant?: PartnerInviteEmailVariant;
	/** Pre-escaped custom middle paragraph; required when variant is custom */
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

const founderEmail = filosignContactEmail("founder");

function partnerInviteFootnote(): ReactNode {
	return (
		<>
			Questions? Email me at{" "}
			<a href={`mailto:${founderEmail}`} className="text-fg underline">
				{founderEmail}
			</a>
			.
		</>
	);
}

/** Subject uses raw recipient name (caller provides unescaped display name). */
export function partnerInviteSubject(
	_recipientNameRaw: string,
	variant: PartnerInviteEmailVariant = "warm",
): string {
	if (variant === "cold") {
		return "You're invited to try filosign";
	}
	return "Your filosign pilot is here.";
}

export function partnerInviteCopy(
	input: PartnerInviteCopyInput,
): PartnerInviteCopy {
	const {
		recipientName,
		trialDays,
		variant = "warm",
		customMiddleParagraph,
	} = input;

	if (variant === "custom") {
		if (!customMiddleParagraph?.trim()) {
			throw new Error("customMiddleParagraph required for custom variant");
		}
		return {
			subject: "",
			title: "Let's get you set up!",
			preheader: `Your filosign pilot setup link is ready (${trialDays}-day access).`,
			body: (
				<>
					Hey {recipientName}, welcome to filosign!
					<br />
					<br />
					{escapedParagraphLines(customMiddleParagraph)}
					<br />
					<br />
					Use the link below to sign up. It gives you {trialDays} days on our
					best plan!
				</>
			),
			ctaLabel: "Set up your account",
			signOff: "Best regards, Kartik",
			footnote: partnerInviteFootnote(),
		};
	}

	if (variant === "cold") {
		return {
			subject: "",
			title: "You're invited to try filosign",
			preheader:
				"A personal design-partner invite to explore filosign on our best plan.",
			body: (
				<>
					Hi {recipientName},
					<br />
					<br />
					{PARTNER_INVITE_COLD_MIDDLE}
					<br />
					<br />
					Your pilot includes {trialDays} days on our best plan. Use the link
					below when you are ready.
				</>
			),
			ctaLabel: "Accept invite",
			signOff: "Best regards, Kartik",
			footnote: partnerInviteFootnote(),
		};
	}

	return {
		subject: "",
		title: "Let's get you set up!",
		preheader: `I'll personally map one workflow for your team over the next ${trialDays} days.`,
		body: (
			<>
				Hey {recipientName}, welcome to filosign!
				<br />
				<br />
				{PARTNER_INVITE_WARM_MIDDLE}
				<br />
				<br />
				Use the link below to sign up. It gives you {trialDays} days on our best
				plan!
			</>
		),
		ctaLabel: "Set up your account",
		signOff: "Best regards, Kartik",
		footnote: partnerInviteFootnote(),
	};
}
