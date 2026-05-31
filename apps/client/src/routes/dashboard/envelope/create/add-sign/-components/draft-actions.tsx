import { useFilosignContext } from "@filosign/react";
import { useEntitlements } from "@filosign/react/billing";
import { useCreateOrgTemplate } from "@filosign/react/orgs";
import {
	ArrowSquareOutIcon,
	ChatCircleIcon,
	CheckIcon,
	FileTextIcon,
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
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import { Input } from "@/src/lib/components/ui/input";
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
	const { rpc } = useFilosignContext();
	const createTemplate = useCreateOrgTemplate();
	const [shareOpen, setShareOpen] = useState(false);
	const [commentsOpen, setCommentsOpen] = useState(false);
	const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
	const [templateName, setTemplateName] = useState("");
	const [templateSaving, setTemplateSaving] = useState(false);
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
						onClick={() => {
							setTemplateName(createForm?.emailSubject || "");
							setTemplateDialogOpen(true);
						}}
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
			<Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Save as Template</DialogTitle>
						<DialogDescription>
							Create a reusable template for your workspace from this draft.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 pt-2">
						<div className="space-y-2">
							<Label htmlFor="designer-template-name">Template Name</Label>
							<Input
								id="designer-template-name"
								placeholder="E.g. Standard NDA"
								value={templateName}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
									setTemplateName(e.target.value)
								}
								maxLength={120}
								autoFocus
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setTemplateDialogOpen(false)}
							disabled={templateSaving}
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="primary"
							onClick={async () => {
								if (!templateName.trim()) {
									toast.error("Please enter a template name");
									return;
								}
								setTemplateSaving(true);
								try {
									const draftDetails = await rpc.drafts.get({
										draftId: serverDraftId || "",
									});
									if (
										!draftDetails.documents ||
										draftDetails.documents.length === 0
									) {
										throw new Error("This draft has no PDF document uploaded.");
									}
									if (!draftDetails.headDekWrappedOmk) {
										throw new Error(
											"Please save the draft first to generate encryption keys.",
										);
									}
									const primaryDoc = draftDetails.documents[0];
									const placementManifest = draftDetails.headSnapshot
										?.placementManifest ?? { fields: [] };

									await createTemplate.mutateAsync({
										name: templateName.trim(),
										s3Key: primaryDoc.s3Key,
										dekWrappedOmk: draftDetails.headDekWrappedOmk || "",
										placementManifest,
									});
									toast.success("Saved as template!");
									setTemplateDialogOpen(false);
									setTemplateName("");
								} catch (err) {
									toast.error(
										err instanceof Error
											? err.message
											: "Failed to save template",
									);
								} finally {
									setTemplateSaving(false);
								}
							}}
							disabled={templateSaving || !templateName.trim()}
						>
							{templateSaving ? "Saving..." : "Save Template"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
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
