import { PlusIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ConfirmAlertDialog } from "@/src/lib/components/app/confirm-alert-dialog";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { Tabs, TabsList, TabsTrigger } from "@/src/lib/components/ui/tabs";
import {
	DocumentCard,
	formatDocumentCardDate,
} from "@/src/lib/domains/documents/document-card";
import { mapFileToDocumentCardProps } from "@/src/lib/domains/documents/map-file-to-card-props";
import { useDraftDelete } from "@/src/lib/domains/documents/use-draft-delete";
import { useDocuments } from "@/src/routes/dashboard/_shell/document/all/-lib/context/context";
import { parseDocumentTab } from "@/src/routes/dashboard/_shell/document/all/-lib/hooks/use-documents-controller";

export function DocumentsContent() {
	const {
		viewMode,
		activeTab,
		setActiveTab,
		filteredItems,
		hasAnyContent,
		isLoading,
		handleItemClick,
		handleDraftClick,
	} = useDocuments();

	const {
		requestDelete,
		deleteOpen,
		closeDelete,
		confirmDelete,
		deletePending,
	} = useDraftDelete();

	return (
		<Tabs
			value={activeTab}
			onValueChange={(val) => {
				const tab = parseDocumentTab(val);
				if (tab) setActiveTab(tab);
			}}
			className="flex flex-col flex-1 min-h-0"
		>
			<div className="flex flex-col border-b border-border bg-background/50 backdrop-blur-sm">
				<div className="px-8 py-2">
					<TabsList variant="line" className="h-10">
						<TabsTrigger value="all">All</TabsTrigger>
						<TabsTrigger value="sent">Sent</TabsTrigger>
						<TabsTrigger value="received">Received</TabsTrigger>
						<TabsTrigger value="drafts">Drafts</TabsTrigger>
					</TabsList>
				</div>
			</div>

			<motion.div
				className="flex min-h-0 flex-1 flex-col overflow-y-auto p-8"
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2, delay: 0.3 }}
			>
				{isLoading ? (
					<div className="flex flex-1 flex-col items-center justify-center gap-2 py-24">
						<InlineLoader size="lg" />
						<p className="text-sm text-muted-foreground">Loading documents…</p>
					</div>
				) : !hasAnyContent ? (
					<div className="flex min-h-0 flex-1 flex-col items-center justify-center">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.2, delay: 0.4 }}
							className="space-y-4 text-center"
						>
							<h2 className="font-semibold text-foreground">No documents</h2>
							<p className="max-w-md px-4 text-muted-foreground">
								You have not yet created or received any documents. Get started
								by creating a new document.
							</p>
							<Link to="/dashboard/envelope/create">
								<Button variant="primary" className="gap-2">
									<PlusIcon className="size-4" weight="bold" />
									Create New Document
								</Button>
							</Link>
						</motion.div>
					</div>
				) : filteredItems.length === 0 ? (
					<div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center py-20 space-y-2">
						<p className="font-medium text-foreground text-sm">
							No items found
						</p>
						<p className="text-xs text-muted-foreground">
							There are no items under the "{activeTab}" filter.
						</p>
					</div>
				) : (
					<div className="space-y-4">
						{viewMode === "list" ? (
							<div className="space-y-2">
								{filteredItems.map((item) => {
									if (item.isDraft) {
										const draft = item.draftRow;
										return (
											<DocumentCard
												key={draft.id}
												kind="draft"
												variant="list"
												title={draft.title}
												subtitle={`Updated ${formatDocumentCardDate(draft.updatedAt)}`}
												draftId={draft.id}
												onOpen={() => handleDraftClick(draft.id)}
												onDeleteDraft={requestDelete}
												deleteDisabled={deletePending}
											/>
										);
									}
									const file = item.fileRow;
									const { title, subtitle } = mapFileToDocumentCardProps(file);
									return (
										<DocumentCard
											key={file.pieceCid}
											kind={file.type}
											variant="list"
											title={title}
											subtitle={subtitle}
											onOpen={() => handleItemClick(file)}
										/>
									);
								})}
							</div>
						) : (
							<div className="grid grid-cols-2 @md:grid-cols-3 @xl:grid-cols-4 @2xl:grid-cols-5 @3xl:grid-cols-6 @5xl:grid-cols-8 gap-3">
								{filteredItems.map((item) => {
									if (item.isDraft) {
										const draft = item.draftRow;
										return (
											<DocumentCard
												key={draft.id}
												kind="draft"
												variant="grid"
												title={draft.title}
												subtitle={formatDocumentCardDate(draft.updatedAt)}
												draftId={draft.id}
												onOpen={() => handleDraftClick(draft.id)}
												onDeleteDraft={requestDelete}
												deleteDisabled={deletePending}
											/>
										);
									}
									const file = item.fileRow;
									const { title, subtitle } = mapFileToDocumentCardProps(file);
									return (
										<DocumentCard
											key={file.pieceCid}
											kind={file.type}
											variant="grid"
											title={title}
											subtitle={subtitle}
											onOpen={() => handleItemClick(file)}
										/>
									);
								})}
							</div>
						)}
					</div>
				)}
			</motion.div>

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
		</Tabs>
	);
}
