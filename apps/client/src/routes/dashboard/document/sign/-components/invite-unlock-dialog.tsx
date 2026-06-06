import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import { renderInviteUnlockWizardPanel } from "@/src/routes/dashboard/document/sign/-components/invite-unlock-panels";
import type { SignInviteUnlockController } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-invite-unlock";
import { ColdInviteNotForYouCallout } from "@/src/routes/onboarding/-components/ColdInviteNotForYouCallout";

type InvitePayload = NonNullable<SignInviteUnlockController["invite"]>;

type Props = {
	unlock: SignInviteUnlockController;
	invite: InvitePayload;
	onCancelHome: () => void;
};

export function SignInviteUnlockDialog({
	unlock,
	invite,
	onCancelHome,
}: Props) {
	const wizardDialogOpen = !(
		unlock.shouldSwitchAccountPrompt && unlock.wizardPanel === "passphrase"
	);

	return (
		<>
			<Dialog open={wizardDialogOpen}>
				<DialogContent className="sm:max-w-md" showCloseButton={false}>
					{renderInviteUnlockWizardPanel(unlock, invite)}
				</DialogContent>
			</Dialog>

			<Dialog open={unlock.shouldSwitchAccountPrompt}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Switch account to continue</DialogTitle>
					</DialogHeader>
					<ColdInviteNotForYouCallout
						className="mt-1"
						recipientEmails={invite.recipientEmails}
						signedInEmailForUi={unlock.signedInEmailForUi}
					/>
					<DialogFooter className="mt-4">
						<Button type="button" variant="outline" onClick={onCancelHome}>
							Cancel
						</Button>
						<Button
							type="button"
							variant="primary"
							onClick={() => void unlock.runSwitchAccount()}
						>
							Switch account
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
