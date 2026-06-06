import { SpinnerIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import {
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { Textarea } from "@/src/lib/components/ui/textarea";
import type { SignInviteUnlockController } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-invite-unlock";
import { OnboardingSwitchAccountLink } from "@/src/routes/onboarding/-components/OnboardingSwitchAccountLink";

type InvitePayload = NonNullable<SignInviteUnlockController["invite"]>;

function busyPanelTitle(panel: SignInviteUnlockController["wizardPanel"]) {
	if (panel === "signingIn") return "Signing you in…";
	if (panel === "settingUpAccount") return "Setting up your account";
	if (panel === "unlocking") return "Unlocking with your wallet";
	return "One moment";
}

function busyPanelDescription(
	panel: SignInviteUnlockController["wizardPanel"],
) {
	if (panel === "signingIn") return "Continue in the window if prompted.";
	if (panel === "settingUpAccount") {
		return "Creating your Filosign keys and workspace. This usually takes a few seconds.";
	}
	if (panel === "unlocking") {
		return "Confirm in your wallet if prompted. If automatic unlock fails, use your 24-word recovery phrase.";
	}
	return "Loading your session…";
}

export function InviteUnlockBusyPanel({
	panel,
}: {
	panel: SignInviteUnlockController["wizardPanel"];
}) {
	return (
		<>
			<DialogHeader className="space-y-2 text-left">
				<DialogTitle>{busyPanelTitle(panel)}</DialogTitle>
				<DialogDescription>{busyPanelDescription(panel)}</DialogDescription>
			</DialogHeader>
			<div className="flex justify-center py-6">
				<InlineLoader size="md" />
			</div>
		</>
	);
}

export function InviteUnlockSetupFailedPanel({
	unlock,
}: {
	unlock: SignInviteUnlockController;
}) {
	return (
		<>
			<DialogHeader className="space-y-2 text-left">
				<DialogTitle>Could not set up your account</DialogTitle>
				<DialogDescription>
					{unlock.autoRegisterError ?? "Check your connection and try again."}
				</DialogDescription>
			</DialogHeader>
			<Button
				type="button"
				variant="primary"
				className="w-full"
				onClick={() => unlock.retryAutoRegister?.()}
			>
				Retry
			</Button>
		</>
	);
}

export function InviteUnlockFilosignRecoveryPanel({
	unlock,
}: {
	unlock: SignInviteUnlockController;
}) {
	return (
		<>
			<DialogHeader className="space-y-2 text-left">
				<DialogTitle>Recovery phrase</DialogTitle>
				<DialogDescription>
					Your wallet could not unlock this session. Enter your 24-word Filosign
					recovery phrase (from Profile settings).
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
			{unlock.decryptError && (
				<p className="text-sm text-destructive">{unlock.decryptError}</p>
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
		<>
			<DialogHeader className="space-y-2 text-left">
				<DialogTitle>Enter passphrase</DialogTitle>
				<DialogDescription>
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
					Passphrase must be exactly six words (hyphen-separated). Current
					segments detected: {unlock.phraseWordCount}
				</p>
			)}
			{unlock.decryptError && (
				<p className="text-sm text-destructive">{unlock.decryptError}</p>
			)}
			<Button
				type="button"
				variant="primary"
				className="w-full"
				disabled={
					unlock.coldDecrypt.isPending || unlock.claimColdInvite.isPending
				}
				onClick={() => void unlock.handleUnlockDocument()}
			>
				{unlock.coldDecrypt.isPending || unlock.claimColdInvite.isPending ? (
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
				From <span className="text-foreground">{invite.senderLabel}</span>
			</p>
			<OnboardingSwitchAccountLink
				className="border-t border-border mt-4 pt-4"
				stayAfterLogout
				onStayAfterLogout={unlock.resetWizardAfterSwitchAccount}
			/>
		</>
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
		return <InviteUnlockBusyPanel panel={panel} />;
	}
	if (panel === "setupFailed") {
		return <InviteUnlockSetupFailedPanel unlock={unlock} />;
	}
	if (panel === "filosignRecovery") {
		return <InviteUnlockFilosignRecoveryPanel unlock={unlock} />;
	}
	return <InviteUnlockPassphrasePanel unlock={unlock} invite={invite} />;
}
