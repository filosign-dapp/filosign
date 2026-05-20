import { SpinnerIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { Textarea } from "@/src/lib/components/ui/textarea";
import { ColdInviteNotForYouCallout } from "@/src/routes/onboarding/-components/ColdInviteNotForYouCallout";
import { OnboardingSwitchAccountLink } from "@/src/routes/onboarding/-components/OnboardingSwitchAccountLink";
import type { SignInviteUnlockController } from "../-lib/hooks/useSignInviteUnlock";

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
					{unlock.wizardPanel === "signingIn" ||
					unlock.wizardPanel === "busy" ||
					unlock.wizardPanel === "redirecting" ||
					unlock.wizardPanel === "unlocking" ? (
						<>
							<DialogHeader>
								<DialogTitle>
									{unlock.wizardPanel === "signingIn"
										? "Signing you in…"
										: unlock.wizardPanel === "redirecting"
											? "Setting up your account"
											: unlock.wizardPanel === "unlocking"
												? "Unlocking with your wallet"
												: "One moment"}
								</DialogTitle>
								<DialogDescription>
									{unlock.wizardPanel === "signingIn"
										? "Continue in the window if prompted."
										: unlock.wizardPanel === "redirecting"
											? "Taking you to registration…"
											: unlock.wizardPanel === "unlocking"
												? "Confirm in your wallet if prompted. If automatic unlock fails, use your 24-word recovery phrase."
												: "Loading your session…"}
								</DialogDescription>
							</DialogHeader>
							<div className="flex justify-center py-6">
								<InlineLoader size="md" />
							</div>
						</>
					) : unlock.wizardPanel === "filosignRecovery" ? (
						<>
							<DialogHeader>
								<DialogTitle>Recovery phrase</DialogTitle>
								<DialogDescription>
									Your wallet could not unlock this session. Enter your 24-word
									Filosign recovery phrase (from onboarding).
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-2">
								<Label htmlFor="sign-invite-filosign-recovery">
									Filosign recovery phrase
								</Label>
								<Textarea
									id="sign-invite-filosign-recovery"
									autoComplete="off"
									spellCheck={false}
									value={unlock.filosignRecoveryPhrase}
									onChange={(e) =>
										unlock.setFilosignRecoveryPhrase(e.target.value)
									}
									placeholder="24-word recovery phrase"
									rows={5}
									className="font-mono text-sm"
									onKeyDown={(e) => {
										if (e.key === "Enter" && e.ctrlKey) {
											void unlock.submitFilosignRecovery();
										}
									}}
								/>
							</div>
							{unlock.decryptError && (
								<p className="text-sm text-destructive">
									{unlock.decryptError}
								</p>
							)}
							<Button
								type="button"
								variant="primary"
								className="w-full"
								disabled={
									unlock.isFilosignRecoveryPending ||
									!unlock.filosignRecoveryPhrase.trim()
								}
								onClick={() => void unlock.submitFilosignRecovery()}
							>
								{unlock.isFilosignRecoveryPending ? (
									<>
										<SpinnerIcon className="size-4 animate-spin mr-2" />
										Unlocking…
									</>
								) : (
									"Continue"
								)}
							</Button>
						</>
					) : (
						<>
							<DialogHeader>
								<DialogTitle>Enter passphrase</DialogTitle>
								<DialogDescription className="text-left">
									Six hyphenated words sent to{" "}
									<span className="font-medium text-foreground">
										{invite.recipientEmails.join(", ")}
									</span>
									. Enter them exactly as given (words separated by hyphens).
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-2">
								<Label htmlFor="sign-invite-phrase">Six-word passphrase</Label>
								<Input
									id="sign-invite-phrase"
									type="text"
									autoComplete="off"
									spellCheck={false}
									value={unlock.phrase}
									onChange={(e) => unlock.setPhrase(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") void unlock.handleUnlockDocument();
									}}
									placeholder="e.g. abandon-ability-able-about-above-absent"
									className="font-mono text-sm"
								/>
							</div>
							{unlock.phraseWordCount > 0 && unlock.phraseWordCount !== 6 && (
								<p className="text-xs text-muted-foreground">
									Passphrase must be exactly six words (hyphen-separated).
									Current segments detected: {unlock.phraseWordCount}
								</p>
							)}
							{unlock.decryptError && (
								<p className="text-sm text-destructive">
									{unlock.decryptError}
								</p>
							)}
							<Button
								type="button"
								variant="primary"
								className="w-full"
								disabled={
									unlock.coldDecrypt.isPending ||
									unlock.claimColdInvite.isPending
								}
								onClick={() => void unlock.handleUnlockDocument()}
							>
								{unlock.coldDecrypt.isPending ||
								unlock.claimColdInvite.isPending ? (
									<>
										<SpinnerIcon className="size-4 animate-spin mr-2" />
										{unlock.coldDecrypt.isPending
											? "Unlocking…"
											: "Securing for your wallet…"}
									</>
								) : (
									"Unlock document"
								)}
							</Button>
							<p className="text-xs text-muted-foreground text-center">
								From{" "}
								<span className="text-foreground">{invite.senderLabel}</span>
							</p>
							<OnboardingSwitchAccountLink
								className="border-t border-border mt-4 pt-4"
								stayAfterLogout
								onStayAfterLogout={unlock.resetWizardAfterSwitchAccount}
							/>
						</>
					)}
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
