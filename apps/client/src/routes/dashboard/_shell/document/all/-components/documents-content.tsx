import { MotionReveal, Pressable } from "@filosign/motion";
import {
	FileTextIcon,
	MagnifyingGlassIcon,
	PlusIcon,
} from "@phosphor-icons/react";
import { ConfirmAlertDialog } from "@/src/lib/components/app/confirm-alert-dialog";
import { AppEmptyState } from "@/src/lib/components/app/empty-state";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { Input } from "@/src/lib/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/src/lib/components/ui/tabs";
import {
	DocumentCard,
	formatDocumentCardDate,
} from "@/src/lib/domains/documents/document-card";
import { documentRowGridSubtitle } from "@/src/lib/domains/documents/document-list-format";
import { DraftRenameDialog } from "@/src/lib/domains/documents/draft-rename-dialog";
import { useDraftDelete } from "@/src/lib/domains/documents/use-draft-delete";
import { useDraftRename } from "@/src/lib/domains/documents/use-draft-rename";
import { useStartNewEnvelope } from "@/src/lib/domains/drafts";
import { useDocuments } from "@/src/routes/dashboard/_shell/document/all/-lib/context/context";
import type { DocumentTab } from "@/src/routes/dashboard/_shell/document/all/-lib/hooks/use-documents-controller";
import { parseDocumentTab } from "@/src/routes/dashboard/_shell/document/all/-lib/hooks/use-documents-controller";
import { DocumentsTable } from "./documents-table";

function filterEmptyCopy(tab: DocumentTab): {
	title: string;
	description: string;
} {
	switch (tab) {
		case "sent":
			return {
				title: "No sent documents yet",
				description: "Documents you send will appear here.",
			};
		case "received":
			return {
				title: "No received documents yet",
				description: "Documents others send you will appear here.",
			};
		case "drafts":
			return {
				title: "No drafts",
				description: "Saved envelope drafts will appear here.",
			};
		default:
			return {
				title: "No items found",
				description: "Try another filter or view all documents.",
			};
	}
}

export function DocumentsContent() {
	const startNewEnvelope = useStartNewEnvelope();
	const {
		viewMode,
		activeTab,
		setActiveTab,
		items,
		hasAnyContent,
		isLoading,
		hasSearchQuery,
		searchInput,
		setSearchInput,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		handleFileClick,
		handleDraftClick,
	} = useDocuments();
	const {
		requestDelete,
		deleteOpen,
		closeDelete,
		confirmDelete,
		deletePending,
	} = useDraftDelete();
	const {
		requestRename,
		renameOpen,
		renameTarget,
		closeRename,
		confirmRename,
		renamePending,
	} = useDraftRename();

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
				<div className="px-6 pb-3 sm:hidden">
					<Input
						type="search"
						placeholder="Search by title…"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						maxLength={100}
						aria-label="Search documents by title"
					/>
				</div>
				<div className="px-6">
					<TabsList variant="line" className="h-10">
						<TabsTrigger value="all">All</TabsTrigger>
						<TabsTrigger value="sent">Sent</TabsTrigger>
						<TabsTrigger value="received">Received</TabsTrigger>
						<TabsTrigger value="drafts">Drafts</TabsTrigger>
					</TabsList>
				</div>
			</div>

			<MotionReveal
				className="flex min-h-0 flex-1 flex-col overflow-y-auto p-8"
				preset="smooth"
				delay={0.3}
				onlyOnce
				id="documents-tab-content"
			>
				{isLoading ? (
					<div className="flex flex-1 flex-col items-center justify-center gap-2 py-24">
						<InlineLoader size="lg" />
						<p className="text-sm text-muted-foreground">Loading documents…</p>
					</div>
				) : !hasAnyContent ? (
					<MotionReveal
						preset="smooth"
						delay={0.4}
						className="flex min-h-0 flex-1"
					>
						<AppEmptyState
							preset="page"
							icon={FileTextIcon}
							title="No documents yet"
							description="Create an envelope, save a draft, or receive a signed document to see items here."
						>
							<Pressable preset="snappy">
								<Button
									type="button"
									variant="primary"
									className="gap-2"
									onClick={startNewEnvelope}
								>
									<PlusIcon className="size-4" weight="bold" />
									Create New Document
								</Button>
							</Pressable>
						</AppEmptyState>
					</MotionReveal>
				) : items.length === 0 ? (
					hasSearchQuery ? (
						<AppEmptyState
							preset="page"
							variant="outline"
							icon={MagnifyingGlassIcon}
							title="No documents match your search"
							description="Try a different title or clear the search field."
						>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setSearchInput("")}
							>
								Clear search
							</Button>
						</AppEmptyState>
					) : (
						<AppEmptyState
							preset="page"
							variant="outline"
							title={filterEmptyCopy(activeTab).title}
							description={filterEmptyCopy(activeTab).description}
						>
							{activeTab !== "all" ? (
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setActiveTab("all")}
								>
									View all
								</Button>
							) : null}
						</AppEmptyState>
					)
				) : (
					<div className="space-y-4">
						{viewMode === "list" ? (
							<DocumentsTable
								items={items}
								onOpenEnvelope={handleFileClick}
								onOpenDraft={handleDraftClick}
								onRenameDraft={requestRename}
								onDeleteDraft={requestDelete}
								renameDisabled={renamePending}
								deleteDisabled={deletePending}
							/>
						) : (
							<div className="grid grid-cols-2 @md:grid-cols-3 @xl:grid-cols-4 @2xl:grid-cols-5 @3xl:grid-cols-6 @5xl:grid-cols-8 gap-3">
								{items.map((item) =>
									item.kind === "draft" ? (
										<DocumentCard
											key={item.id}
											kind="draft"
											variant="grid"
											hideInlineActions
											title={item.title}
											subtitle={`Updated ${formatDocumentCardDate(new Date(item.updatedAt))}`}
											draftId={item.id}
											onOpen={() => handleDraftClick(item.id)}
											onRenameDraft={requestRename}
											renameDisabled={renamePending}
											onDeleteDraft={requestDelete}
											deleteDisabled={deletePending}
										/>
									) : (
										<DocumentCard
											key={item.id}
											kind={item.direction}
											variant="grid"
											hideInlineActions
											title={item.title}
											subtitle={documentRowGridSubtitle(item)}
											onOpen={() => handleFileClick(item.id)}
										/>
									),
								)}
							</div>
						)}
						<DraftRenameDialog
							open={renameOpen}
							onOpenChange={closeRename}
							defaultTitle={renameTarget?.title ?? ""}
							onConfirm={confirmRename}
							pending={renamePending}
						/>
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
						{hasNextPage ? (
							<div className="flex justify-center pt-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={isFetchingNextPage}
									onClick={() => void fetchNextPage()}
								>
									{isFetchingNextPage ? "Loading…" : "Load more"}
								</Button>
							</div>
						) : null}
					</div>
				)}
			</MotionReveal>
		</Tabs>
	);
}
