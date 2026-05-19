import {
	ArrowLeftIcon,
	CheckCircleIcon,
	FileTextIcon,
	SpinnerIcon,
} from "@phosphor-icons/react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { ColdShareDialog } from "../../envelope/create/add-sign/_components/ColdShareDialog";
import { SignDocumentBody } from "./_components/SignDocumentBody";
import { SignDocumentShell } from "./_components/SignDocumentShell";
import { SignDocumentShellHeader } from "./_components/SignDocumentShellHeader";
import { SignDocumentSidebar } from "./_components/SignDocumentSidebar";
import { SignDocumentStickyHeader } from "./_components/SignDocumentStickyHeader";
import { SignInviteUnlockDialog } from "./_components/SignInviteUnlockDialog";
import { useSignDocument } from "./useSignDocument";
import { useSignInviteUnlock } from "./useSignInviteUnlock";

export function SignDocumentPage() {
	const navigate = useNavigate();
	const search = useSearch({ from: "/dashboard/document/sign/" });
	const pieceCid = search.pieceCid?.trim() ?? "";
	const inviteToken = search.invite?.trim() ?? "";

	const sign = useSignDocument();
	const unlock = useSignInviteUnlock({ pieceCid, inviteToken });

	const {
		navigation,
		fileQuery,
		identity,
		placement,
		viewer,
		signing,
		meta,
		compliance,
		coldShare,
		refs,
		acknowledge,
	} = sign;

	const { file, fileLoading, fileError, acknowledgeFile } = fileQuery;

	const hasDecryptionKeys = Boolean(
		file?.kemCiphertext && file?.encryptedEncryptionKey,
	);
	const needsInviteUnlock =
		Boolean(inviteToken) && !hasDecryptionKeys && !unlock.claimSucceeded;

	const toDashboard = () => navigate({ to: "/dashboard" });
	const toHome = () => navigate({ to: "/" });

	if (needsInviteUnlock) {
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

	if (fileLoading) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4">
				<InlineLoader size="lg" />
				<p className="text-sm text-muted-foreground">Preparing document…</p>
			</div>
		);
	}

	if (fileError || !file) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
				<FileTextIcon className="h-16 w-16 text-muted-foreground mb-4" />
				<h2 className="text-xl font-semibold mb-2">File Not Found</h2>
				<p className="text-muted-foreground mb-4">
					The document you're trying to sign could not be found.
				</p>
				{fileError && (
					<p className="text-xs text-destructive mb-4 max-w-md text-center">
						Error:{" "}
						{fileError instanceof Error ? fileError.message : "Unknown error"}
					</p>
				)}
				<Button onClick={toDashboard}>
					<ArrowLeftIcon className="h-4 w-4 mr-2" />
					Back to Dashboard
				</Button>
			</div>
		);
	}

	if (file && (!file.kemCiphertext || !file.encryptedEncryptionKey)) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen bg-background p-8">
				<FileTextIcon className="h-16 w-16 text-amber-500 mb-4" />
				<h2 className="text-xl font-semibold mb-2">Accept File?</h2>
				<p className="text-muted-foreground mb-4 text-center max-w-md">
					This document must be acknowledged before it can be viewed or signed.
				</p>
				<div className="flex items-center gap-3">
					<Button
						onClick={() => void acknowledge.handleAcknowledge()}
						disabled={acknowledgeFile.isPending}
						variant="primary"
					>
						{acknowledgeFile.isPending ? (
							<>
								<SpinnerIcon className="size-5 animate-spin" />
								Accepting
							</>
						) : (
							<>
								<CheckCircleIcon className="size-5" />
								Accept File
							</>
						)}
					</Button>
				</div>
			</div>
		);
	}

	if (!pieceCid || !file) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen p-8">
				<FileTextIcon className="h-16 w-16 text-muted-foreground mb-4" />
				<h2 className="text-xl font-semibold mb-2">Invalid Request</h2>
				<p className="text-muted-foreground mb-4">
					No document specified for signing.
				</p>
				<Button onClick={toDashboard}>
					<ArrowLeftIcon className="h-4 w-4 mr-2" />
					Back to Dashboard
				</Button>
			</div>
		);
	}

	return (
		<SignDocumentShell
			stickyHeader={
				<SignDocumentStickyHeader
					navigation={navigation}
					file={file}
					pieceCid={pieceCid}
					identity={identity}
					signing={signing}
					meta={meta}
					viewer={viewer}
					compliance={compliance}
					coldShare={coldShare}
					placement={placement}
				/>
			}
			body={
				<>
					<SignDocumentBody
						containerRef={refs.containerRef}
						documentRef={refs.documentRef}
						fileContent={{
							pieceCid,
							viewError: viewer.viewError,
							fileData: viewer.fileData,
							viewFilePending: viewer.viewFile.isPending,
							handleViewFile: viewer.handleViewFile,
							zoom: viewer.zoom,
							myPlacementFields: placement.myPlacementFields,
							alreadySigned: signing.alreadySigned,
							isMyPlacementFieldDone: placement.isMyPlacementFieldDone,
							togglePlacementField: placement.togglePlacementField,
							previewPdfBytes: viewer.previewPdfBytes,
							signPdfPage: viewer.signPdfPage,
							setSignPdfPage: viewer.setSignPdfPage,
							setSignPdfNumPages: viewer.setSignPdfNumPages,
							handleDownload: compliance.handleDownload,
							canSign: signing.canSign,
						}}
					/>
					<SignDocumentSidebar
						file={file}
						identity={identity}
						placement={placement}
						signing={signing}
						meta={meta}
					/>
				</>
			}
		>
			<ColdShareDialog
				open={coldShare.coldShareDialogOpen}
				share={coldShare.coldShare}
				onDone={() => {
					coldShare.setColdShareDialogOpen(false);
					coldShare.setColdShare(null);
				}}
			/>
		</SignDocumentShell>
	);
}
