import { useEntitlements } from "@filosign/react/billing";
import {
	ArrowSquareOutIcon,
	ChatCircleIcon,
	FileTextIcon,
} from "@phosphor-icons/react";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useCryptoRequired } from "@/src/lib/auth/use-crypto-required";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import { useDraftCommentCount, useDraftSaveUi } from "@/src/lib/domains/drafts";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { ShareDraftDialog } from "@/src/routes/dashboard/envelope/create/-components/share-draft-dialog";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/hooks/use-prompt-plan-upgrade";
import { DraftCommentsSheet } from "@/src/routes/dashboard/envelope/create/add-sign/-components/draft-comments-sheet";
import { DraftCryptoRecoveryDialog } from "@/src/routes/dashboard/envelope/create/add-sign/-components/draft-crypto-recovery-dialog";
import { DraftSaveButton } from "@/src/routes/dashboard/envelope/create/add-sign/-components/draft-save-button";
import { DraftTemplateDialog } from "@/src/routes/dashboard/envelope/create/add-sign/-components/draft-template-dialog";

const addSignRouteApi = getRouteApi("/dashboard/envelope/create/add-sign/");

function formatCommentBadgeCount(count: number) {
	if (count <= 0) return null;
	if (count > 9) return "9+";
	return String(count);
}

function draftActionDisabled(args: {
	planId: string | undefined;
	serverDraftId: string | undefined;
	isSaving: boolean;
	hasChanges: boolean;
	needsDraftCrypto: boolean;
	cryptoReady: boolean;
}) {
	if (args.planId === "free") return false;
	return (
		!args.serverDraftId ||
		args.isSaving ||
		args.hasChanges ||
		(args.needsDraftCrypto && !args.cryptoReady)
	);
}

function draftActionTitle(args: {
	isSaving: boolean;
	hasChanges: boolean;
	needsDraftCrypto: boolean;
	cryptoReady: boolean;
}) {
	if (args.isSaving) return "Wait for save to finish before sharing.";
	if (args.hasChanges) return "Save your changes before sharing.";
	if (args.needsDraftCrypto && !args.cryptoReady) {
		return "Unlock encryption keys before sharing.";
	}
	return undefined;
}

export function AddSignDraftActions() {
	const { serverDraftId: urlServerDraftId } = addSignRouteApi.useSearch();
	const createForm = useStorePersist((s) => s.createForm);
	const { data: entitlements } = useEntitlements();
	const [shareOpen, setShareOpen] = useState(false);
	const [commentsOpen, setCommentsOpen] = useState(false);
	const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
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
	const showComments = Boolean(
		entitlements?.features["features.draft_comments"]?.enabled,
	);
	const shareDisabled = draftActionDisabled({
		planId,
		serverDraftId,
		isSaving,
		hasChanges,
		needsDraftCrypto,
		cryptoReady: cryptoRequired.isReady,
	});

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

	const handleShareClick = () => {
		if (planId === "free") {
			promptPlanUpgrade("documents.sent.monthly");
			return;
		}
		setShareOpen(true);
	};

	return (
		<>
			<div className="flex items-center gap-2">
				<DraftSaveButton
					planId={planId}
					isSaving={isSaving}
					showSavedState={showSavedState}
					savedLabel={savedLabel}
					hasChanges={hasChanges}
					isSavedToServer={isSavedToServer}
					needsDraftCrypto={needsDraftCrypto}
					cryptoReady={cryptoRequired.isReady}
					needsRecovery={cryptoRequired.needsRecovery}
					documentCount={createForm?.documents.length ?? 0}
					onSave={handleSaveDraft}
					onPromptUpgrade={() => promptPlanUpgrade("documents.sent.monthly")}
				/>
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
					disabled={shareDisabled}
					title={draftActionTitle({
						isSaving,
						hasChanges,
						needsDraftCrypto,
						cryptoReady: cryptoRequired.isReady,
					})}
					onClick={handleShareClick}
					className="gap-1.5"
				>
					<ArrowSquareOutIcon className="size-4" />
					<span>Share draft</span>
				</Button>
				{entitlements?.features["features.shared_templates"]?.enabled && (
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={!serverDraftId}
						title={
							serverDraftId
								? "Save this draft as a reusable template"
								: "Save draft first to save as template"
						}
						onClick={() => setTemplateDialogOpen(true)}
						className="gap-1.5"
					>
						<FileTextIcon className="size-4 text-secondary" weight="bold" />
						<span>Save as Template</span>
					</Button>
				)}
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
			<DraftTemplateDialog
				open={templateDialogOpen}
				onOpenChange={setTemplateDialogOpen}
				serverDraftId={serverDraftId}
				initialName={createForm?.emailSubject || ""}
			/>
			<DraftCryptoRecoveryDialog
				open={showCryptoRecoveryDialog}
				onOpenChange={setShowCryptoRecoveryDialog}
				cryptoRequired={cryptoRequired}
				onSubmitRecovery={handleSubmitRecovery}
			/>
		</>
	);
}
