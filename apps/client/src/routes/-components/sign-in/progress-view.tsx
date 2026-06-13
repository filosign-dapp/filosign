import { SpinnerIcon } from "@phosphor-icons/react";
import type { SignInController } from "@/src/routes/-lib/hooks/use-sign-in-controller";
import { SignInColdInviteCallout } from "./cold-invite-callout";

type Props = Pick<
	SignInController,
	| "view"
	| "showColdInviteMismatch"
	| "coldInviteWarning"
	| "continueAnywayColdSearch"
>;

export function SignInProgressView({
	view,
	showColdInviteMismatch,
	coldInviteWarning,
	continueAnywayColdSearch,
}: Props) {
	const isAutoRegistering = view === "auto-registering";

	return (
		<div className="flex flex-col items-center gap-4 py-8 text-center">
			<SignInColdInviteCallout
				showColdInviteMismatch={showColdInviteMismatch}
				recipientEmails={coldInviteWarning.recipientEmails}
				signedInEmailForUi={coldInviteWarning.signedInEmailForUi}
				continueAnywayColdSearch={continueAnywayColdSearch}
			/>
			<SpinnerIcon
				className="size-10 animate-spin text-muted-foreground"
				aria-hidden
			/>
			<div className="space-y-1">
				<p className="text-foreground">
					{isAutoRegistering ? "Setting up your account…" : "Signing you in…"}
				</p>
				<p className="text-sm text-muted-foreground">
					{isAutoRegistering
						? "Creating your Filosign keys and workspace. This usually takes a few seconds."
						: "Connecting your wallet and checking your Filosign account."}
				</p>
			</div>
		</div>
	);
}
