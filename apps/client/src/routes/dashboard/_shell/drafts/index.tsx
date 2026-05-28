import { useDraftsList } from "@filosign/react/drafts";
import { FileTextIcon, PlusIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useMemo } from "react";
import { ConfirmAlertDialog } from "@/src/lib/components/app/confirm-alert-dialog";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import {
	DocumentCard,
	formatDocumentCardDate,
} from "@/src/lib/domains/documents/document-card";
import { useDraftDelete } from "@/src/lib/domains/documents/use-draft-delete";
import { useOpenDraft, useStartNewEnvelope } from "@/src/lib/domains/drafts";

export const Route = createFileRoute("/dashboard/_shell/drafts/")({
	component: DraftsIndexPage,
});

function DraftsIndexPage() {
	const { data, isLoading } = useDraftsList();
	const { openDraft } = useOpenDraft();
	const startNewEnvelope = useStartNewEnvelope();
	const {
		requestDelete,
		deleteOpen,
		closeDelete,
		confirmDelete,
		deletePending,
	} = useDraftDelete();
	const drafts = useMemo(() => data?.drafts ?? [], [data]);

	return (
		<div className="flex min-h-0 flex-1 flex-col bg-background @container">
			<div className="flex min-h-0 flex-1 flex-col">
				<motion.div
					className="flex items-center justify-between px-8 py-4"
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.2, delay: 0.2 }}
				>
					<div className="flex items-center gap-4">
						<h2 className="text-lg font-medium text-foreground">Drafts</h2>
					</div>
					<div className="flex items-center gap-4">
						<Button
							type="button"
							variant="primary"
							size="sm"
							className="gap-2 group"
							onClick={startNewEnvelope}
						>
							<PlusIcon className="size-4" weight="bold" />
							<p className="hidden sm:inline">New Draft</p>
						</Button>
					</div>
				</motion.div>

				<motion.div
					className="flex min-h-0 flex-1 flex-col overflow-y-auto p-8 space-y-6"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.2, delay: 0.3 }}
				>
					{isLoading ? (
						<div className="flex flex-1 flex-col items-center justify-center gap-2 py-24">
							<InlineLoader size="lg" />
							<p className="text-sm text-muted-foreground">Loading drafts…</p>
						</div>
					) : drafts.length === 0 ? (
						<div className="flex min-h-0 flex-1 flex-col items-center justify-center">
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.2, delay: 0.4 }}
								className="space-y-4 text-center"
							>
								<div className="size-40 mx-auto mb-6">
									<FileTextIcon
										className="size-full text-muted-foreground/50"
										weight="light"
									/>
								</div>
								<h2 className="font-semibold text-foreground">No drafts</h2>
								<p className="max-w-md px-4 text-muted-foreground">
									You haven’t saved a draft yet. Start an envelope, place
									fields, and hit{" "}
									<span className="font-medium">Save draft</span>.
								</p>
								<Button
									type="button"
									variant="primary"
									className="gap-2"
									onClick={startNewEnvelope}
								>
									<PlusIcon className="size-4" weight="bold" />
									Create Draft
								</Button>
							</motion.div>
						</div>
					) : (
						<div className="space-y-2">
							{drafts.map((draft) => {
								const updatedAt = new Date(draft.updatedAt);
								return (
									<DocumentCard
										key={draft.id}
										kind="draft"
										variant="list"
										title={draft.title}
										subtitle={`Updated ${formatDocumentCardDate(updatedAt)}`}
										draftId={draft.id}
										onOpen={() => openDraft(draft.id)}
										onDeleteDraft={requestDelete}
										deleteDisabled={deletePending}
									/>
								);
							})}
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
						</div>
					)}
				</motion.div>
			</div>
		</div>
	);
}
