import { ArrowLeftIcon, FileTextIcon } from "@phosphor-icons/react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { useSignPieceFileContext } from "@/src/routes/dashboard/document/sign/-lib/context/sign-piece-file-context";
import { useSignInviteUnlock } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-invite-unlock";
import { SignInviteUnlockDialog } from "./invite-unlock-dialog";
import { SignDocumentPage } from "./page";
import { SignDocumentShell } from "./shell";
import { SignDocumentShellHeader } from "./shell-header";

/**
 * Cold-invite unlock flow only — avoids mounting the full sign document controller.
 */
export function SignInviteUnlockRoutePage() {
	const navigate = useNavigate();
	const search = useSearch({ from: "/dashboard/document/sign/" });
	const pieceCid = search.pieceCid?.trim() ?? "";
	const inviteToken = search.invite?.trim() ?? "";

	const { file } = useSignPieceFileContext();
	const hasDecryptionKeys = Boolean(
		(file?.kemCiphertext && file?.encryptedEncryptionKey) ||
			(file?.organizationId &&
				file?.orgKemCiphertext &&
				file?.orgEncryptedEncryptionKey),
	);

	const unlock = useSignInviteUnlock({ pieceCid, inviteToken });

	const toDashboard = () => navigate({ to: "/dashboard" });
	const toHome = () => navigate({ to: "/" });

	if (hasDecryptionKeys || unlock.claimSucceeded) {
		return <SignDocumentPage />;
	}

	if (!unlock.ready) {
		return (
			<SignDocumentShell
				stickyHeader={
					<SignDocumentShellHeader pieceCid={pieceCid} onBack={toDashboard} />
				}
				body={
					<div className="flex-1 flex items-center justify-center bg-background">
						<InlineLoader size="lg" />
					</div>
				}
			/>
		);
	}

	if (unlock.isLoading) {
		return (
			<SignDocumentShell
				stickyHeader={
					<SignDocumentShellHeader pieceCid={pieceCid} onBack={toDashboard} />
				}
				body={
					<div className="flex-1 flex flex-col items-center justify-center gap-3 bg-background px-4">
						<InlineLoader size="lg" />
						<p className="text-sm text-muted-foreground">Loading invite…</p>
					</div>
				}
			/>
		);
	}

	if (unlock.error || !unlock.invite) {
		return (
			<SignDocumentShell
				stickyHeader={
					<SignDocumentShellHeader pieceCid={pieceCid} onBack={toHome} />
				}
				body={
					<div className="flex-1 flex flex-col items-center justify-center gap-4 bg-background px-4">
						<FileTextIcon className="size-14 text-muted-foreground" />
						<h1 className="text-lg font-semibold">Invite not found</h1>
						<p className="text-sm text-muted-foreground text-center max-w-md">
							This link may be invalid or expired. Ask the sender for a new
							invite.
						</p>
						<Button variant="outline" onClick={toHome}>
							<ArrowLeftIcon className="size-4 mr-2" />
							Home
						</Button>
					</div>
				}
			/>
		);
	}

	const invite = unlock.invite;

	return (
		<SignDocumentShell
			stickyHeader={
				<SignDocumentShellHeader pieceCid={pieceCid} onBack={toDashboard} />
			}
			body={
				<>
					<div className="flex-1 h-full overflow-auto flex flex-col items-center justify-center p-6 bg-background">
						<FileTextIcon className="size-12 text-muted-foreground mb-3" />
						<div className="text-center space-y-1 max-w-md">
							<h1 className="text-lg font-semibold">
								{unlock.shouldSwitchAccountPrompt
									? "Wrong account for this invite"
									: "You have a document to sign"}
							</h1>
							<p className="text-sm text-muted-foreground">
								{unlock.shouldSwitchAccountPrompt
									? "Use Switch account in the dialog to sign in with the invited address."
									: "When your session is ready, enter the six-word passphrase the sender gave you out-of-band."}
							</p>
						</div>
					</div>
					<aside className="hidden lg:flex w-72 shrink-0 border-l border-border bg-background flex-col overflow-y-auto">
						<div className="p-4 space-y-3 border-b border-border">
							<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Invite
							</h3>
							<p className="text-sm text-foreground">{invite.senderLabel}</p>
							<p className="text-xs text-muted-foreground">
								Recipients: {invite.recipientEmails.join(", ")}
							</p>
						</div>
						<div className="p-4 text-xs text-muted-foreground">
							{unlock.shouldSwitchAccountPrompt
								? "Close the switch-account dialog after you change logins, or cancel to leave."
								: "Use the dialog to sign in and enter your passphrase."}
						</div>
					</aside>
				</>
			}
		>
			<SignInviteUnlockDialog
				unlock={unlock}
				invite={invite}
				onCancelHome={toHome}
			/>
		</SignDocumentShell>
	);
}
