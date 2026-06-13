import { useId } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { Dialog } from "@/src/lib/components/ui/dialog";
import {
	FeatureDialogActions,
	FeatureDialogBody,
	FeatureDialogContent,
	FeatureDialogHeader,
	FeatureDialogMedia,
	FeatureDialogPanel,
} from "@/src/lib/components/ui/feature-dialog";
import { FEATURE_DIALOG_IMAGES } from "@/src/lib/domains/feature-dialog/images";
import type { SignInviteUnlockController } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-invite-unlock";
import { ColdInviteNotForYouCallout } from "@/src/routes/onboarding/-components/ColdInviteNotForYouCallout";
import {
	inviteUnlockWizardMeta,
	renderInviteUnlockWizardPanel,
} from "./panels";

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
	const wizardTitleId = useId();
	const switchTitleId = useId();
	const wizardDialogOpen = !(
		unlock.shouldSwitchAccountPrompt && unlock.wizardPanel === "passphrase"
	);
	const meta = inviteUnlockWizardMeta(unlock, invite);

	return (
		<>
			<Dialog open={wizardDialogOpen}>
				<FeatureDialogContent aria-labelledby={wizardTitleId}>
					<FeatureDialogMedia src={meta.imageSrc} badge={meta.badge} />

					<FeatureDialogPanel>
						<FeatureDialogHeader
							badge={meta.badge}
							title={meta.title}
							titleId={wizardTitleId}
							description={meta.description}
						/>
						{renderInviteUnlockWizardPanel(unlock, invite)}
					</FeatureDialogPanel>
				</FeatureDialogContent>
			</Dialog>

			<Dialog open={unlock.shouldSwitchAccountPrompt}>
				<FeatureDialogContent aria-labelledby={switchTitleId}>
					<FeatureDialogMedia
						src={FEATURE_DIALOG_IMAGES.signInOtpAndInviteUnlockDialog}
						badge="Wrong account"
					/>

					<FeatureDialogPanel>
						<FeatureDialogHeader
							badge="Wrong account"
							title="Switch account to continue"
							titleId={switchTitleId}
							description="This invite was sent to a different email than the account you are signed in with."
						/>

						<FeatureDialogBody>
							<ColdInviteNotForYouCallout
								recipientEmails={invite.recipientEmails}
								signedInEmailForUi={unlock.signedInEmailForUi}
							/>

							<FeatureDialogActions>
								<Button
									type="button"
									variant="primary"
									size="lg"
									className="w-full"
									onClick={() => void unlock.runSwitchAccount()}
								>
									Switch account
								</Button>
								<Button
									type="button"
									variant="outline"
									size="lg"
									className="w-full"
									onClick={onCancelHome}
								>
									Cancel
								</Button>
							</FeatureDialogActions>
						</FeatureDialogBody>
					</FeatureDialogPanel>
				</FeatureDialogContent>
			</Dialog>
		</>
	);
}
