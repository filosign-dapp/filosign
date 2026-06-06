import { ColdInviteNotForYouCallout } from "@/src/routes/onboarding/-components/ColdInviteNotForYouCallout";
import { OnboardingSwitchAccountLink } from "@/src/routes/onboarding/-components/OnboardingSwitchAccountLink";

type Props = {
	showColdInviteMismatch: boolean;
	recipientEmails: string[];
	signedInEmailForUi: string;
	continueAnywayColdSearch:
		| { coldPieceCid: string; coldInvite: string }
		| undefined;
};

export function SignInColdInviteCallout({
	showColdInviteMismatch,
	recipientEmails,
	signedInEmailForUi,
	continueAnywayColdSearch,
}: Props) {
	if (!showColdInviteMismatch) return null;

	return (
		<>
			<ColdInviteNotForYouCallout
				className="w-full max-w-md text-left"
				recipientEmails={recipientEmails}
				signedInEmailForUi={signedInEmailForUi}
			/>
			<OnboardingSwitchAccountLink
				className="w-full max-w-md"
				coldInviteMismatch={showColdInviteMismatch}
				continueAnywayColdSearch={continueAnywayColdSearch}
			/>
		</>
	);
}
