import { useEntitlements } from "@filosign/react/billing";
import {
	ArrowSquareOutIcon,
	ChatCircleIcon,
	DotsThreeIcon,
	FileTextIcon,
	FloppyDiskIcon,
	KeyIcon,
} from "@phosphor-icons/react";
import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useCryptoRequired } from "@/src/lib/auth/use-crypto-required";
import { Button } from "@/src/lib/components/ui/button";
import {
	ButtonGroup,
	ButtonGroupText,
} from "@/src/lib/components/ui/button-group";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/src/lib/components/ui/dropdown-menu";
import { InlineLoader } from "@/src/lib/components/ui/loader";
import { useDraftCommentCount, useDraftSaveUi } from "@/src/lib/domains/drafts";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { cn } from "@/src/lib/utils/utils";
import { ShareDraftDialog } from "@/src/routes/dashboard/envelope/create/-components/share-draft-dialog";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/hooks/use-prompt-plan-upgrade";
import { DraftCommentsSheet } from "@/src/routes/dashboard/envelope/create/add-sign/-components/draft/comments-sheet";
import { DraftCryptoRecoveryDialog } from "@/src/routes/dashboard/envelope/create/add-sign/-components/draft/crypto-recovery-dialog";
import { DraftSaveDialog } from "@/src/routes/dashboard/envelope/create/add-sign/-components/draft/save-dialog";
import { DraftTemplateDialog } from "@/src/routes/dashboard/envelope/create/add-sign/-components/draft/template-dialog";

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

function draftStatusLabel(args: {
	isSaving: boolean;
	hasChanges: boolean;
	isSavedToServer: boolean;
	showSavedState: boolean;
	hasServerDraft: boolean;
}) {
	if (args.isSaving) {
		return { label: "Saving", dotClass: "bg-muted-foreground animate-pulse" };
	}
	if (args.showSavedState || args.isSavedToServer) {
		return { label: "Saved", dotClass: "bg-secondary" };
	}
	if (args.hasChanges) {
		return { label: "Unsaved", dotClass: "bg-amber-500" };
	}
	if (args.hasServerDraft) {
		return { label: "Saved", dotClass: "bg-secondary" };
	}
	return { label: "Unsaved", dotClass: "bg-amber-500" };
}

export function AddSignDraftActions() {
	const { serverDraftId: urlServerDraftId } = addSignRouteApi.useSearch();
	const createForm = useStorePersist((s) => s.createForm);
	const { data: entitlements } = useEntitlements();
	const [shareOpen, setShareOpen] = useState(false);
	const [commentsOpen, setCommentsOpen] = useState(false);
	const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
	const [saveDialogOpen, setSaveDialogOpen] = useState(false);
	const [showCryptoRecoveryDialog, setShowCryptoRecoveryDialog] =
		useState(false);
	const promptPlanUpgrade = usePromptPlanUpgrade();

	const planId = entitlements?.planId;
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
		handleSaveDraft,
		persistDraftWithTitle,
		needsDraftNaming,
		defaultDraftTitle,
	} = useDraftSaveUi({
		urlServerDraftId,
		createForm,
		cryptoReady: cryptoRequired.isReady,
		cryptoNeedsRecovery: cryptoRequired.needsRecovery,
	});

	const commentCount = useDraftCommentCount(serverDraftId);
	const badgeLabel = formatCommentBadgeCount(commentCount);

	const showComments = Boolean(
		entitlements?.features["features.draft_comments"]?.enabled,
	);
	const showTemplates = Boolean(
		entitlements?.features["features.shared_templates"]?.enabled,
	);

	const shareDisabled = draftActionDisabled({
		planId,
		serverDraftId,
		isSaving,
		hasChanges,
		needsDraftCrypto,
		cryptoReady: cryptoRequired.isReady,
	});
	const shareDisabledReason = draftActionTitle({
		isSaving,
		hasChanges,
		needsDraftCrypto,
		cryptoReady: cryptoRequired.isReady,
	});

	const saveDisabled =
		planId !== "free" &&
		(isSaving ||
			(needsDraftCrypto && !cryptoRequired.isReady) ||
			(isSavedToServer && !hasChanges) ||
			(createForm?.documents.length ?? 0) === 0);

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

	const runSave = useCallback(
		(title?: string) => {
			if (planId === "free") {
				promptPlanUpgrade("documents.sent.monthly");
				return;
			}
			handleSaveDraft(title);
		},
		[planId, promptPlanUpgrade, handleSaveDraft],
	);

	const handleSaveClick = useCallback(() => {
		if (needsDraftNaming) {
			setSaveDialogOpen(true);
			return;
		}
		runSave();
	}, [needsDraftNaming, runSave]);

	const handleShareClick = () => {
		if (planId === "free") {
			promptPlanUpgrade("documents.sent.monthly");
			return;
		}
		if (shareDisabled) return;
		setShareOpen(true);
	};

	const status = draftStatusLabel({
		isSaving,
		hasChanges,
		isSavedToServer,
		showSavedState,
		hasServerDraft: Boolean(serverDraftId),
	});

	return (
		<>
			<ButtonGroup aria-label="Draft actions">
				<ButtonGroupText
					className={cn(
						"hidden h-10 gap-2 border-border/60 bg-muted/30 px-2.5 text-xs font-normal text-muted-foreground shadow-none sm:flex",
					)}
				>
					{isSaving ? (
						<InlineLoader size="sm" />
					) : (
						<span
							className={cn("size-2 rounded-full", status.dotClass)}
							aria-hidden
						/>
					)}
					<span>{status.label}</span>
				</ButtonGroupText>
				<Button
					type="button"
					variant="outline"
					size="lg"
					className="gap-1.5"
					disabled={saveDisabled}
					isLoading={isSaving}
					onClick={handleSaveClick}
				>
					<FloppyDiskIcon className="size-4" />
					<span className="hidden sm:inline">Save draft</span>
				</Button>
				{showComments ? (
					<Button
						type="button"
						variant="outline"
						size="icon-lg"
						className="relative"
						disabled={!serverDraftId}
						aria-label={
							badgeLabel ? `Comments, ${badgeLabel} total` : "Comments"
						}
						onClick={() => setCommentsOpen(true)}
					>
						<ChatCircleIcon className="size-4" />
						{badgeLabel ? (
							<span className="absolute -top-1 -right-1 flex size-4 min-w-4 items-center justify-center rounded-full bg-secondary px-0.5 text-[10px] font-medium leading-none text-secondary-foreground">
								{badgeLabel}
							</span>
						) : null}
					</Button>
				) : null}
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								type="button"
								variant="outline"
								size="icon-lg"
								aria-label="More draft options"
							/>
						}
					>
						<DotsThreeIcon className="size-4" weight="bold" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-52">
						<DropdownMenuItem
							disabled={shareDisabled}
							onClick={handleShareClick}
							title={shareDisabled ? shareDisabledReason : undefined}
						>
							<ArrowSquareOutIcon className="size-4" />
							Share draft
						</DropdownMenuItem>
						{showTemplates ? (
							<DropdownMenuItem
								disabled={!serverDraftId}
								onClick={() => setTemplateDialogOpen(true)}
							>
								<FileTextIcon className="size-4" />
								Save as template
							</DropdownMenuItem>
						) : null}
						{needsDraftCrypto && cryptoRequired.needsRecovery ? (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={() => setShowCryptoRecoveryDialog(true)}
								>
									<KeyIcon className="size-4" />
									Unlock keys
								</DropdownMenuItem>
							</>
						) : null}
					</DropdownMenuContent>
				</DropdownMenu>
			</ButtonGroup>

			<DraftSaveDialog
				open={saveDialogOpen}
				onOpenChange={setSaveDialogOpen}
				defaultTitle={defaultDraftTitle}
				isSaving={isSaving}
				onConfirm={(title) => {
					setSaveDialogOpen(false);
					void persistDraftWithTitle(title);
				}}
			/>

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
