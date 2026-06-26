import { Text } from "@react-email/components";
import {
	type WorkspaceInviteCopyInput,
	workspaceInviteCopy,
} from "../src/copy/workspace-invite";
import { filosignEmailAssets } from "../src/email-assets";
import { WelcomeLayout } from "./_themes/barebone/welcome-layout";

export type WorkspaceInviteEmailProps = WorkspaceInviteCopyInput & {
	ctaHref: string;
};

export default function WorkspaceInviteEmail({
	ctaHref,
	...copyInput
}: WorkspaceInviteEmailProps) {
	const copy = workspaceInviteCopy(copyInput);

	return (
		<WelcomeLayout
			title={copy.title}
			preheader={copy.preheader}
			ctaHref={ctaHref}
			ctaLabel={copy.ctaLabel}
			footnote={copy.footnote}
			contactChannel="support"
			heroImage={filosignEmailAssets.barebone.partnerInviteHero}
		>
			<Text className="font-16 text-fg-2 m-0 font-sans">{copy.body}</Text>
			<Text className="font-16 text-fg-2 mt-6 mb-0 font-sans">
				{copy.signOff}
			</Text>
		</WelcomeLayout>
	);
}

WorkspaceInviteEmail.PreviewProps = {
	inviteeName: "Alex",
	inviterName: "Jordan Lee",
	orgName: "Acme Legal",
	roleLabel: "Sender",
	expiresAtLabel: "July 1, 2026",
	ctaHref: "https://app.filosign.com/?orgInvite=example",
} satisfies WorkspaceInviteEmailProps;
