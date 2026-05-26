import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { ChatCircleIcon } from "@phosphor-icons/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import { useDraftCommentCount } from "@/src/lib/domains/drafts/use-draft-comment-count";
import { useServerDraftActions } from "@/src/lib/domains/drafts/use-server-draft-actions";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { safeAsync } from "@/src/lib/utils/safe";
import { ShareDraftDialog } from "@/src/routes/dashboard/envelope/create/-components/share-draft-dialog";
import { DraftCommentsSheet } from "@/src/routes/dashboard/envelope/create/add-sign/-components/draft-comments-sheet";
import { signatureFieldBoxCssPx } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/field-box";
import { buildPlacementManifestForDocument } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send-envelope";

function formatCommentBadgeCount(count: number) {
	if (count <= 0) return null;
	if (count > 9) return "9+";
	return String(count);
}

export function AddSignDraftActions() {
	const createForm = useStorePersist((s) => s.createForm);
	const { persistDraft, isSaving } = useServerDraftActions();
	const [shareOpen, setShareOpen] = useState(false);
	const [commentsOpen, setCommentsOpen] = useState(false);

	const serverDraftId = createForm?.serverDraftId;
	const commentCount = useDraftCommentCount(serverDraftId);
	const badgeLabel = formatCommentBadgeCount(commentCount);

	const handleSaveDraft = useCallback(() => {
		if (!createForm) return;
		const doc = createForm.documents[0];
		if (!doc) {
			toast.error("Upload a document first");
			return;
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
			toast.success("Draft saved");
		});
	}, [createForm, persistDraft]);

	return (
		<>
			<div className="flex items-center gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={isSaving || (createForm?.documents.length ?? 0) === 0}
					onClick={handleSaveDraft}
				>
					{isSaving ? "Saving…" : "Save draft"}
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={!serverDraftId}
					onClick={() => setShareOpen(true)}
				>
					Share draft
				</Button>
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
			</div>
			{serverDraftId ? (
				<>
					<DraftCommentsSheet
						draftId={serverDraftId}
						open={commentsOpen}
						onOpenChange={setCommentsOpen}
					/>
					<ShareDraftDialog
						open={shareOpen}
						onOpenChange={setShareOpen}
						draftId={serverDraftId}
					/>
				</>
			) : null}
		</>
	);
}
