import type { ReactNode } from "react";
import { filosignContactEmail } from "../contact-emails";

export type WorkspaceInviteCopyInput = {
	inviteeName: string;
	inviterName: string;
	orgName: string;
	roleLabel: string;
	expiresAtLabel?: string;
};

export type WorkspaceInviteCopy = {
	subject: string;
	title: string;
	preheader: string;
	body: ReactNode;
	ctaLabel: string;
	signOff: string;
	footnote?: ReactNode;
};

const supportEmail = filosignContactEmail("support");

function workspaceInviteFootnote(): ReactNode {
	return (
		<>
			After you join, an admin may need to grant encryption access before you
			can open team drafts. Questions? Email{" "}
			<a href={`mailto:${supportEmail}`} className="text-fg underline">
				{supportEmail}
			</a>
			.
		</>
	);
}

export function workspaceInviteSubject(orgName: string): string {
	return `You're invited to join ${orgName} on Filosign`;
}

export function workspaceInviteCopy(
	input: WorkspaceInviteCopyInput,
): WorkspaceInviteCopy {
	const { inviteeName, inviterName, orgName, roleLabel, expiresAtLabel } =
		input;

	return {
		subject: workspaceInviteSubject(orgName),
		title: `Join ${orgName}`,
		preheader: `${inviterName} invited you to collaborate on Filosign as ${roleLabel}.`,
		body: (
			<>
				Hi {inviteeName},
				<br />
				<br />
				{inviterName} invited you to join <strong>{orgName}</strong> on Filosign
				as <strong>{roleLabel}</strong>.
				<br />
				<br />
				Sign in or create an account with this email address, then accept the
				invitation to access the workspace.
				{expiresAtLabel ? (
					<>
						<br />
						<br />
						This link expires on {expiresAtLabel}.
					</>
				) : null}
			</>
		),
		ctaLabel: "Accept invitation",
		signOff: "See you inside, The Filosign team",
		footnote: workspaceInviteFootnote(),
	};
}
