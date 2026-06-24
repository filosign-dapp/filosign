import type { ReactNode } from "react";
import { Button } from "@/src/lib/components/ui/button";
import {
	FeatureDialogActions,
	FeatureDialogBody,
} from "@/src/lib/components/ui/feature-dialog";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { InlineLoader } from "@/src/lib/components/ui/loader";
import { Textarea } from "@/src/lib/components/ui/textarea";
import { FEATURE_DIALOG_IMAGES } from "@/src/lib/domains/feature-dialog/images";
import type { SignInviteUnlockController } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-invite-unlock";
import { OnboardingSwitchAccountLink } from "@/src/routes/onboarding/-components/OnboardingSwitchAccountLink";

type InvitePayload = NonNullable<SignInviteUnlockController["invite"]>;

export type InviteUnlockPanelMeta = {
	badge: string;
	title: string;
	description: ReactNode;
	imageSrc: string;
};

function busyPanelMeta(
	panel: SignInviteUnlockController["wizardPanel"],
): InviteUnlockPanelMeta {
	if (panel === "signingIn") {
		return {
			badge: "Sign in",
			title: "Signing you in…",
			description: "This usually takes a few seconds.",
			imageSrc: FEATURE_DIALOG_IMAGES.signInOtpAndInviteUnlockDialog,
		};
	}
	if (panel === "settingUpAccount") {
		return {
			badge: "Get started",
			title: "Setting up your account",
			description:
				"Creating your Filosign keys and workspace. This usually takes a few seconds.",
			imageSrc: FEATURE_DIALOG_IMAGES.workspaceCreateInviteTrialDialog,
		};
	}
	if (panel === "unlocking") {
		return {
			badge: "Unlock",
			title: "Unlocking your keys",
			description:
				"Filosign is authorizing your keys. If automatic unlock fails, use your 24-word recovery phrase.",
			imageSrc: FEATURE_DIALOG_IMAGES.recoveryPhraseAndCryptoUnlockDialog,
		};
	}
	return {
		badge: "Loading",
		title: "One moment",
		description: "Loading your session…",
		imageSrc: FEATURE_DIALOG_IMAGES.signInOtpAndInviteUnlockDialog,
	};
}

export function inviteUnlockWizardMeta(
	unlock: SignInviteUnlockController,
	invite: InvitePayload,
): InviteUnlockPanelMeta {
	const panel = unlock.wizardPanel;
	if (
		panel === "signingIn" ||
		panel === "busy" ||
		panel === "settingUpAccount" ||
		panel === "unlocking"
	) {
		return busyPanelMeta(panel);
	}
	if (panel === "setupFailed") {
		return {
			badge: "Setup",
			title: "Could not set up your account",
			description:
				unlock.autoRegisterError ?? "Check your connection and try again.",
			imageSrc: FEATURE_DIALOG_IMAGES.workspaceCreateInviteTrialDialog,
		};
	}
	if (panel === "filosignRecovery") {
		return {
			badge: "Recovery",
			title: "Recovery phrase",
			description:
				"Automatic unlock did not work. Enter your 24-word Filosign recovery phrase (from Profile settings).",
			imageSrc: FEATURE_DIALOG_IMAGES.recoveryPhraseAndCryptoUnlockDialog,
		};
	}
	return {
		badge: "Unlock document",
		title: "Enter passphrase",
		description: (
			<>
				Six hyphenated words sent to{" "}
				<span className="font-medium text-foreground">
					{invite.recipientEmails.join(", ")}
				</span>
				. Enter them exactly as given (words separated by hyphens).
			</>
		),
		imageSrc: FEATURE_DIALOG_IMAGES.coldShareAccessDialog,
	};
}

export function InviteUnlockBusyPanel() {
	return (
		<FeatureDialogBody>
			<div className="flex justify-center py-6">
				<InlineLoader size="md" />
			</div>
		</FeatureDialogBody>
	);
}

export function InviteUnlockSetupFailedPanel({
	unlock,
}: {
	unlock: SignInviteUnlockController;
}) {
	return (
		<FeatureDialogBody>
			<FeatureDialogActions>
				<Button
					type="button"
					variant="primary"
					size="lg"
					className="w-full"
					onClick={() => unlock.retryAutoRegister?.()}
				>
					Retry
				</Button>
			</FeatureDialogActions>
		</FeatureDialogBody>
	);
}

export function InviteUnlockFilosignRecoveryPanel({
	unlock,
}: {
	unlock: SignInviteUnlockController;
}) {
	return (
		<FeatureDialogBody>
			<div className="space-y-2">
				<Label htmlFor="sign-invite-filosign-recovery">
					Filosign recovery phrase
				</Label>
				<Textarea
					id="sign-invite-filosign-recovery"
					autoComplete="off"
					spellCheck={false}
					value={unlock.filosignRecoveryPhrase}
					onChange={(e) => unlock.setFilosignRecoveryPhrase(e.target.value)}
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
			{unlock.decryptError ? (
				<p className="text-sm text-destructive">{unlock.decryptError}</p>
			) : null}
			<FeatureDialogActions>
				<Button
					type="button"
					variant="primary"
					size="lg"
					className="w-full"
					disabled={
						unlock.isFilosignRecoveryPending ||
						!unlock.filosignRecoveryPhrase.trim()
					}
					onClick={() => void unlock.submitFilosignRecovery()}
				>
					{unlock.isFilosignRecoveryPending ? (
						<>
							<InlineLoader size="sm" className="mr-2 text-current" />
							Unlocking…
						</>
					) : (
						"Continue"
					)}
				</Button>
			</FeatureDialogActions>
		</FeatureDialogBody>
	);
}

export function InviteUnlockPassphrasePanel({
	unlock,
	invite,
}: {
	unlock: SignInviteUnlockController;
	invite: InvitePayload;
}) {
	return (
		<FeatureDialogBody>
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
			{unlock.phraseWordCount > 0 && unlock.phraseWordCount !== 6 ? (
				<p className="text-xs text-muted-foreground">
					Passphrase must be exactly six words (hyphen-separated). Current
					segments detected: {unlock.phraseWordCount}
				</p>
			) : null}
			{unlock.decryptError ? (
				<p className="text-sm text-destructive">{unlock.decryptError}</p>
			) : null}
			<FeatureDialogActions>
				<Button
					type="button"
					variant="primary"
					size="lg"
					className="w-full"
					disabled={
						unlock.coldDecrypt.isPending || unlock.claimColdInvite.isPending
					}
					onClick={() => void unlock.handleUnlockDocument()}
				>
					{unlock.coldDecrypt.isPending || unlock.claimColdInvite.isPending ? (
						<>
							<InlineLoader size="sm" className="mr-2 text-current" />
							{unlock.coldDecrypt.isPending
								? "Unlocking…"
								: "Securing your keys…"}
						</>
					) : (
						"Unlock document"
					)}
				</Button>
			</FeatureDialogActions>
			<p className="text-center text-xs text-muted-foreground">
				From <span className="text-foreground">{invite.senderLabel}</span>
			</p>
			<OnboardingSwitchAccountLink
				className="mt-4 border-t border-border pt-4"
				stayAfterLogout
				onStayAfterLogout={unlock.resetWizardAfterSwitchAccount}
			/>
		</FeatureDialogBody>
	);
}

export function renderInviteUnlockWizardPanel(
	unlock: SignInviteUnlockController,
	invite: InvitePayload,
) {
	const panel = unlock.wizardPanel;
	if (
		panel === "signingIn" ||
		panel === "busy" ||
		panel === "settingUpAccount" ||
		panel === "unlocking"
	) {
		return <InviteUnlockBusyPanel />;
	}
	if (panel === "setupFailed") {
		return <InviteUnlockSetupFailedPanel unlock={unlock} />;
	}
	if (panel === "filosignRecovery") {
		return <InviteUnlockFilosignRecoveryPanel unlock={unlock} />;
	}
	return <InviteUnlockPassphrasePanel unlock={unlock} invite={invite} />;
}
