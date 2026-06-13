import { SpinnerIcon } from "@phosphor-icons/react";
import type { SignInController } from "@/src/routes/-lib/hooks/use-sign-in-controller";
import { SignInCardShell } from "./card-shell";
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
		<div className="space-y-8">
			<div className="space-y-2">
				<h1 className="font-manrope text-2xl tracking-tight text-foreground md:text-3xl">
					Welcome to Filosign
				</h1>
				<p className="text-muted-foreground">
					Send envelopes, collect signatures, and keep a clear record when deals
					close.
				</p>
			</div>

			<SignInColdInviteCallout
				showColdInviteMismatch={showColdInviteMismatch}
				recipientEmails={coldInviteWarning.recipientEmails}
				signedInEmailForUi={coldInviteWarning.signedInEmailForUi}
				continueAnywayColdSearch={continueAnywayColdSearch}
			/>

			<SignInCardShell
				title={isAutoRegistering ? "Setting up your account" : "Signing you in"}
				description={
					isAutoRegistering
						? "Creating your Filosign keys and workspace. This usually takes a few seconds."
						: "Connecting your wallet and checking your Filosign account."
				}
			>
				<div className="flex justify-center py-2">
					<SpinnerIcon
						className="size-8 animate-spin text-muted-foreground"
						aria-hidden
					/>
				</div>
			</SignInCardShell>
		</div>
	);
}
