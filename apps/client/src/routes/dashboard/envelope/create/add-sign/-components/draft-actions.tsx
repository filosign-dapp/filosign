import { useEntitlements } from "@filosign/react/billing";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import {
	ArrowSquareOutIcon,
	ChatCircleIcon,
	CheckIcon,
	FloppyDiskIcon,
	SpinnerGapIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { useDraftCommentCount } from "@/src/lib/domains/drafts/use-draft-comment-count";
import { useServerDraftActions } from "@/src/lib/domains/drafts/use-server-draft-actions";
import type { CreateForm } from "@/src/lib/domains/files/envelope-form-types";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { safeAsync } from "@/src/lib/utils/safe";
import { ShareDraftDialog } from "@/src/routes/dashboard/envelope/create/-components/share-draft-dialog";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/context/entitlement-upgrade-context";
import { DraftCommentsSheet } from "@/src/routes/dashboard/envelope/create/add-sign/-components/draft-comments-sheet";
import { signatureFieldBoxCssPx } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/field-box";
import { buildPlacementManifestForDocument } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send-envelope";

function formatCommentBadgeCount(count: number) {
	if (count <= 0) return null;
	if (count > 9) return "9+";
	return String(count);
}

const SAVED_FLASH_MS = 3000;

function getDraftComparisonKey(form: CreateForm | null | undefined): string {
	if (!form) return "";
	return JSON.stringify({
		recipients: form.recipients.map((r) => ({
			email: r.email?.trim() || "",
			name: r.name?.trim() || "",
			role: r.role,
			walletAddress: r.walletAddress?.toLowerCase() || "",
		})),
		emailSubject: form.emailSubject || "",
		emailMessage: form.emailMessage || "",
		documents: (form.documents || []).map((d) => ({
			id: d.id,
			name: d.name,
			size: d.size,
			type: d.type,
		})),
		settlementDrafts: (form.settlementDrafts || []).map((s) => ({
			id: s.id,
			recipientClientRowId: s.recipientClientRowId,
			recipientEmail: s.recipientEmail?.trim() || "",
			recipientSource: s.recipientSource,
			recipientLabel: s.recipientLabel || "",
			recipientWallet: s.recipientWallet?.toLowerCase() || "",
			amountUsdc: s.amountUsdc || "",
			releaseType: s.releaseType,
			specificSignerEmail: s.specificSignerEmail?.trim() || "",
			thresholdN: s.thresholdN,
		})),
		signatureFields: (form.signatureFields || []).map((f) => ({
			id: f.id,
			type: f.type,
			x: Math.round(f.x),
			y: Math.round(f.y),
			page: f.page,
			documentId: f.documentId,
			assignedSignerEmail: f.assignedSignerEmail?.trim() || "",
			required: f.required,
			label: f.label || "",
		})),
	});
}

export function AddSignDraftActions() {
	const createForm = useStorePersist((s) => s.createForm);
	const { persistDraft, isSaving } = useServerDraftActions();
	const { data: entitlements } = useEntitlements();
	const [shareOpen, setShareOpen] = useState(false);
	const [commentsOpen, setCommentsOpen] = useState(false);
	const promptPlanUpgrade = usePromptPlanUpgrade();

	const serverDraftId = createForm?.serverDraftId;
	const needsDraftCrypto =
		Boolean(serverDraftId) && (createForm?.serverDraftRevision ?? 0) > 0;
	const cryptoRequired = useCryptoRequired({ enabled: needsDraftCrypto });
	const commentCount = useDraftCommentCount(serverDraftId);
	const badgeLabel = formatCommentBadgeCount(commentCount);

	const planId = entitlements?.planId;
	const showComments = planId && planId !== "free" && planId !== "individual";

	const [lastSavedKey, setLastSavedKey] = useState<string>("");
	const [showSavedFlash, setShowSavedFlash] = useState(false);
	const [showCryptoRecoveryDialog, setShowCryptoRecoveryDialog] =
		useState(false);
	const savedFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (createForm?.serverDraftId) {
			setLastSavedKey(getDraftComparisonKey(createForm));
		} else {
			setLastSavedKey("");
		}
	}, [createForm?.serverDraftId, createForm?.serverDraftRevision]);

	useEffect(() => {
		return () => {
			if (savedFlashTimerRef.current) {
				clearTimeout(savedFlashTimerRef.current);
			}
		};
	}, []);

	useEffect(() => {
		if (needsDraftCrypto && cryptoRequired.needsRecovery) {
			setShowCryptoRecoveryDialog(true);
		}
	}, [needsDraftCrypto, cryptoRequired.needsRecovery]);

	const currentKey = getDraftComparisonKey(createForm);
	const hasChanges = currentKey !== lastSavedKey;
	const isSavedInDb = !!createForm?.serverDraftId && !hasChanges;
	const showSavedState = showSavedFlash || (isSavedInDb && !isSaving);
	const handleSubmitRecovery = useCallback(async () => {
		try {
			await cryptoRequired.submitRecovery();
			setShowCryptoRecoveryDialog(false);
			toast.success("Encryption keys unlocked");
		} catch {
			// Error string comes from shared unlock state.
		}
	}, [cryptoRequired]);

	const handleSaveDraft = useCallback(() => {
		if (!createForm) return;
		const doc = createForm.documents[0];
		if (!doc) {
			toast.error("Upload a document first");
			return;
		}
		if (!cryptoRequired.isReady) {
			toast.error(
				cryptoRequired.needsRecovery
					? "Unlock encryption keys with your recovery phrase before saving."
					: "Unlocking encryption keys. Try saving again in a moment.",
			);
			return;
		}
		if (import.meta.env.DEV) {
			console.info("[draft-save]", "ui.click", {
				serverDraftId: createForm.serverDraftId,
				revision: createForm.serverDraftRevision,
				hasChanges,
			});
		}
		void safeAsync(() =>
			persistDraft({
				draftId: createForm.serverDraftId,
				revision: createForm.serverDraftRevision ?? 0,
				title: createForm.emailSubject || "Untitled draft",
				localDraftId: createForm.draftId,
				recipients: createForm.recipients,
				emailSubject: createForm.emailSubject,
				emailMessage: createForm.emailMessage,
				documents: createForm.documents,
				settlementDrafts: createForm.settlementDrafts ?? [],
				signatureFields: createForm.signatureFields ?? [],
				placementManifest: buildPlacementManifestForDocument({
					docId: doc.id,
					signerEmailsInOrder: createForm.recipients
						.filter((r) => r.role === "signer")
						.map((r) => normalizePlacementRecipientEmail(r.email.trim())),
					signatureFields: createForm.signatureFields ?? [],
					docWidth: 612,
					docHeight: 792,
					fieldBox: signatureFieldBoxCssPx(false),
				}),
			}),
		).then(([, err]) => {
			if (err) {
				toast.error(
					err.message.length > 0 ? err.message : "Failed to save draft",
				);
				return;
			}
			const savedForm = useStorePersist.getState().createForm;
			if (savedForm) {
				setLastSavedKey(getDraftComparisonKey(savedForm));
			}
			setShowSavedFlash(true);
			if (savedFlashTimerRef.current) {
				clearTimeout(savedFlashTimerRef.current);
			}
			savedFlashTimerRef.current = setTimeout(() => {
				setShowSavedFlash(false);
				savedFlashTimerRef.current = null;
			}, SAVED_FLASH_MS);
		});
	}, [
		createForm,
		cryptoRequired.isReady,
		cryptoRequired.needsRecovery,
		persistDraft,
	]);

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
							(!hasChanges && isSavedInDb) ||
							(createForm?.documents.length ?? 0) === 0)
					}
					title={
						needsDraftCrypto && !cryptoRequired.isReady
							? cryptoRequired.needsRecovery
								? "Unlock encryption keys with recovery phrase to save."
								: "Unlocking encryption keys..."
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
							<span className="text-muted-foreground">Saved</span>
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
