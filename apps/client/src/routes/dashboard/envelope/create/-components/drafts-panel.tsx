import { useDocumentsList } from "@filosign/react/documents";
import { Link } from "@tanstack/react-router";
import { ConfirmAlertDialog } from "@/src/lib/components/app/confirm-alert-dialog";
import { Button } from "@/src/lib/components/ui/button";
import {
	DocumentCard,
	formatDocumentCardDate,
} from "@/src/lib/domains/documents/document-card";
import { useDraftDelete } from "@/src/lib/domains/documents/use-draft-delete";
import { useOpenDraft } from "@/src/lib/domains/drafts";

export function DraftsPanel() {
	const { data, isLoading } = useDocumentsList({ tab: "drafts" });
	const { openDraft } = useOpenDraft();
	const {
		requestDelete,
		deleteOpen,
		closeDelete,
		confirmDelete,
		deletePending,
	} = useDraftDelete();

	const drafts = (data?.items ?? []).filter((row) => row.kind === "draft");

	return (
		<section className="mx-auto max-w-4xl px-8 pb-6">
			<div className="flex items-center justify-between gap-4">
				<h4 className="text-sm font-medium text-muted-foreground">
					Team drafts
				</h4>
				<Button
					type="button"
					variant="outline"
					size="sm"
					render={
						<Link to="/dashboard/document/all" search={{ tab: "drafts" }} />
					}
				>
					View all drafts
				</Button>
			</div>
			{isLoading ? (
				<p className="mt-2 text-sm text-muted-foreground">Loading drafts…</p>
			) : null}
			<div className="mt-3 space-y-2">
				{drafts.map((draft) => (
					<DocumentCard
						key={draft.id}
						kind="draft"
						variant="list"
						title={draft.title}
						subtitle={`Updated ${formatDocumentCardDate(new Date(draft.updatedAt))}`}
						draftId={draft.id}
						onOpen={() => openDraft(draft.id)}
						onDeleteDraft={requestDelete}
						deleteDisabled={deletePending}
					/>
				))}
			</div>
			{drafts.length === 0 && !isLoading ? (
				<p className="mt-2 text-sm text-muted-foreground">
					No saved drafts yet. Save from the placement step.
				</p>
			) : null}
			<ConfirmAlertDialog
				open={deleteOpen}
				onOpenChange={closeDelete}
				title="Delete draft?"
				description="This removes the draft from your list. You cannot undo this action."
				confirmLabel="Delete Draft"
				destructive
				pending={deletePending}
				onConfirm={confirmDelete}
			/>
		</section>
	);
}
