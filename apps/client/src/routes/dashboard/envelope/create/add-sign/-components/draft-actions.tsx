import { useEntitlements } from "@filosign/react/billing";
import {
	ArrowSquareOutIcon,
	ChatCircleIcon,
	CheckIcon,
	FloppyDiskIcon,
	SpinnerGapIcon,
} from "@phosphor-icons/react";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useCryptoRequired } from "@/src/lib/auth/use-crypto-required";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import { Label } from "@/src/lib/components/ui/label";
import { Textarea } from "@/src/lib/components/ui/textarea";
import { useDraftCommentCount, useDraftSaveUi } from "@/src/lib/domains/drafts";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { ShareDraftDialog } from "@/src/routes/dashboard/envelope/create/-components/share-draft-dialog";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/context/entitlement-upgrade-context";
import { DraftCommentsSheet } from "@/src/routes/dashboard/envelope/create/add-sign/-components/draft-comments-sheet";

const addSignRouteApi = getRouteApi("/dashboard/envelope/create/add-sign/");

function formatCommentBadgeCount(count: number) {
	if (count <= 0) return null;
	if (count > 9) return "9+";
	return String(count);
}

export function AddSignDraftActions() {
	const { serverDraftId: urlServerDraftId } = addSignRouteApi.useSearch();
	const createForm = useStorePersist((s) => s.createForm);
	const { data: entitlements } = useEntitlements();
	const [shareOpen, setShareOpen] = useState(false);
	const [commentsOpen, setCommentsOpen] = useState(false);
	const [showCryptoRecoveryDialog, setShowCryptoRecoveryDialog] =
		useState(false);
	const promptPlanUpgrade = usePromptPlanUpgrade();

	const needsDraftCrypto =
		Boolean(createForm?.serverDraftId) &&
		(createForm?.serverDraftRevision ?? 0) > 0;
	const cryptoRequired = useCryptoRequired({ enabled: needsDraftCrypto });

	const {
		serverDraftId,
		isSaving,
		hasChanges,
		isSavedToServer,
		showSavedState,
		savedLabel,
		handleSaveDraft,
	} = useDraftSaveUi({
		urlServerDraftId,
		createForm,
		cryptoReady: cryptoRequired.isReady,
		cryptoNeedsRecovery: cryptoRequired.needsRecovery,
	});

	const commentCount = useDraftCommentCount(serverDraftId);
	const badgeLabel = formatCommentBadgeCount(commentCount);

	const planId = entitlements?.planId;
	const showComments = planId && planId !== "free" && planId !== "individual";

	useEffect(() => {
		if (needsDraftCrypto && cryptoRequired.needsRecovery) {
			setShowCryptoRecoveryDialog(true);
		}
	}, [needsDraftCrypto, cryptoRequired.needsRecovery]);

	const handleSubmitRecovery = useCallback(async () => {
		try {
			await cryptoRequired.submitRecovery();
			setShowCryptoRecoveryDialog(false);
			toast.success("Encryption keys unlocked");
		} catch {
			// Error string comes from shared unlock state.
		}
	}, [cryptoRequired]);

	return (
		<>
			<div className="flex items-center gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={
						planId !== "free" &&
						(isSaving ||
							(needsDraftCrypto && !cryptoRequired.isReady) ||
							(isSavedToServer && !hasChanges) ||
							(createForm?.documents.length ?? 0) === 0)
					}
					title={
						needsDraftCrypto && !cryptoRequired.isReady
							? cryptoRequired.needsRecovery
								? "Unlock encryption keys with recovery phrase to save."
								: "Unlocking encryption keys..."
							: hasChanges
								? "Unsaved changes"
								: undefined
					}
					onClick={() => {
						if (planId === "free") {
							promptPlanUpgrade("documents.sent.monthly");
							return;
						}
						handleSaveDraft();
					}}
					className="gap-1.5"
				>
					{isSaving ? (
						<>
							<SpinnerGapIcon className="size-4 animate-spin" />
							<span>Saving…</span>
						</>
					) : showSavedState ? (
						<>
							<CheckIcon className="size-4 text-green-500" weight="bold" />
							<span className="text-muted-foreground">{savedLabel}</span>
						</>
					) : (
						<>
							<FloppyDiskIcon className="size-4 text-primary" />
							<span>Save draft</span>
						</>
					)}
				</Button>
				{needsDraftCrypto && cryptoRequired.needsRecovery ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => setShowCryptoRecoveryDialog(true)}
					>
						Unlock keys
					</Button>
				) : null}
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={planId !== "free" && !serverDraftId}
					onClick={() => {
						if (planId === "free") {
							promptPlanUpgrade("documents.sent.monthly");
							return;
						}
						setShareOpen(true);
					}}
					className="gap-1.5"
				>
					<ArrowSquareOutIcon className="size-4" />
					<span>Share draft</span>
				</Button>
				{showComments ? (
					<>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={!serverDraftId}
							title={
								serverDraftId
									? "Open draft comments"
									: "Save draft first to enable comments"
							}
							aria-describedby={
								serverDraftId ? undefined : "add-sign-comments-hint"
							}
							className="relative gap-1.5"
							onClick={() => setCommentsOpen(true)}
						>
							<ChatCircleIcon className="size-4 shrink-0" aria-hidden />
							<span className="hidden sm:inline">Comments</span>
							{badgeLabel ? (
								<Badge
									variant="secondary"
									className="h-4 min-w-4 px-1 py-0 text-[10px] sm:ml-0.5"
								>
									{badgeLabel}
								</Badge>
							) : null}
						</Button>
						{!serverDraftId ? (
							<span id="add-sign-comments-hint" className="sr-only">
								Save draft first to enable comments
							</span>
						) : null}
					</>
				) : null}
			</div>
			{serverDraftId ? (
				<>
					{showComments ? (
						<DraftCommentsSheet
							draftId={serverDraftId}
							open={commentsOpen}
							onOpenChange={setCommentsOpen}
						/>
					) : null}
					<ShareDraftDialog
						open={shareOpen}
						onOpenChange={setShareOpen}
						draftId={serverDraftId}
					/>
				</>
			) : null}
			<Dialog
				open={showCryptoRecoveryDialog}
				onOpenChange={setShowCryptoRecoveryDialog}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Unlock encryption keys</DialogTitle>
						<DialogDescription>
							Your wallet could not unlock this session automatically. Enter
							your 24-word recovery phrase to continue saving this draft.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						<Label htmlFor="add-sign-recovery-phrase">Recovery phrase</Label>
						<Textarea
							id="add-sign-recovery-phrase"
							rows={5}
							value={cryptoRequired.recoveryPhrase}
							onChange={(event) =>
								cryptoRequired.setRecoveryPhrase(event.target.value)
							}
							placeholder="24-word recovery phrase"
							spellCheck={false}
						/>
					</div>
					{cryptoRequired.recoveryError ? (
						<p className="text-sm text-destructive">
							{cryptoRequired.recoveryError}
						</p>
					) : null}
					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="ghost"
							onClick={() => setShowCryptoRecoveryDialog(false)}
							disabled={cryptoRequired.recoveryPending}
						>
							Close
						</Button>
						<Button
							type="button"
							variant="primary"
							onClick={() => void handleSubmitRecovery()}
							disabled={
								cryptoRequired.recoveryPending ||
								!cryptoRequired.recoveryPhrase.trim()
							}
						>
							{cryptoRequired.recoveryPending ? "Unlocking…" : "Unlock"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
