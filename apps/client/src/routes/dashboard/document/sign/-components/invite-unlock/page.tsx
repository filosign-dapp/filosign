import { ArrowLeftIcon, FileTextIcon } from "@phosphor-icons/react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/loader";
import { useSignPieceFileContext } from "@/src/routes/dashboard/document/sign/-lib/context/piece-file-context";
import { useSignInviteUnlock } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-invite-unlock";
import { SignDocumentPage } from "../page";
import { SignDocumentShell } from "../shell";
import { SignDocumentShellHeader } from "../shell-header";
import { SignInviteUnlockDialog } from "./dialog";

/**
 * Cold-invite unlock flow only - avoids mounting the full sign document controller.
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

	const shellBody = (content: ReactNode, aside?: ReactNode) => (
		<SignDocumentShell>
			<SignDocumentShellHeader pieceCid={pieceCid} onBack={toDashboard} />
			<div className="flex min-h-0 flex-1 overflow-hidden">
				<div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-background">
					{content}
				</div>
				{aside}
			</div>
		</SignDocumentShell>
	);

	if (!unlock.ready) {
		return shellBody(<InlineLoader size="lg" />);
	}

	if (unlock.isLoading) {
		return shellBody(
			<>
				<InlineLoader size="lg" />
				<p className="mt-3 text-sm text-muted-foreground">Loading invite…</p>
			</>,
		);
	}

	if (unlock.error || !unlock.invite) {
		return (
			<SignDocumentShell>
				<SignDocumentShellHeader pieceCid={pieceCid} onBack={toHome} />
				<div className="flex flex-1 flex-col items-center justify-center gap-4 bg-background px-4">
					<FileTextIcon className="size-14 text-muted-foreground" />
					<h1 className="text-lg font-semibold">Invite not found</h1>
					<p className="max-w-md text-center text-sm text-muted-foreground">
						This link may be invalid or expired. Ask the sender for a new
						invite.
					</p>
					<Button variant="outline" onClick={toHome}>
						<ArrowLeftIcon className="mr-2 size-4" />
						Home
					</Button>
				</div>
			</SignDocumentShell>
		);
	}

	const invite = unlock.invite;

	return (
		<SignDocumentShell>
			<SignDocumentShellHeader pieceCid={pieceCid} onBack={toDashboard} />
			<div className="flex min-h-0 flex-1 overflow-hidden">
				<div className="flex flex-1 flex-col items-center justify-center bg-background p-6">
					<FileTextIcon className="mb-3 size-12 text-muted-foreground" />
					<div className="max-w-md space-y-1 text-center">
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
				<aside className="hidden w-72 shrink-0 flex-col overflow-y-auto border-l border-border bg-background lg:flex">
					<div className="space-y-3 border-b border-border p-4">
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
			</div>
			<SignInviteUnlockDialog
				unlock={unlock}
				invite={invite}
				onCancelHome={toHome}
			/>
		</SignDocumentShell>
	);
}
