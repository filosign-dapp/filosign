import { MotionReveal, Pressable } from "@filosign/motion";
import { FileTextIcon, PlusIcon } from "@phosphor-icons/react";
import { ConfirmAlertDialog } from "@/src/lib/components/app/confirm-alert-dialog";
import { AppEmptyState } from "@/src/lib/components/app/empty-state";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { Tabs, TabsList, TabsTrigger } from "@/src/lib/components/ui/tabs";
import {
	DocumentCard,
	formatDocumentCardDate,
} from "@/src/lib/domains/documents/document-card";
import { useDraftDelete } from "@/src/lib/domains/documents/use-draft-delete";
import { mapFileToDocumentCardProps } from "@/src/lib/domains/documents/map-file-to-card-props";
import { useStartNewEnvelope } from "@/src/lib/domains/drafts";
import { useDocuments } from "@/src/routes/dashboard/_shell/document/all/-lib/context/context";
import type {
	DocumentListItem,
	DocumentTab,
	OrgFileRowView,
} from "@/src/routes/dashboard/_shell/document/all/-lib/hooks/use-documents-controller";
import { parseDocumentTab } from "@/src/routes/dashboard/_shell/document/all/-lib/hooks/use-documents-controller";

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

function DocumentListCard(props: {
	item: DocumentListItem;
	variant: "list" | "grid";
	onOpenFile: (fileRow: OrgFileRowView) => void;
	onOpenDraft: (draftId: string) => void;
	onDeleteDraft?: (draftId: string) => void;
	deleteDisabled?: boolean;
}) {
	if (props.item.kind === "draft") {
		return (
			<DocumentCard
				key={props.item.id}
				kind="draft"
				variant={props.variant}
				title={props.item.title}
				subtitle={`Updated ${formatDocumentCardDate(props.item.date)}`}
				draftId={props.item.id}
				onOpen={() => props.onOpenDraft(props.item.id)}
				onDeleteDraft={props.onDeleteDraft}
				deleteDisabled={props.deleteDisabled}
			/>
		);
	}

	const fileItem = props.item;
	const { title, subtitle } = mapFileToDocumentCardProps(fileItem.fileRow);
	return (
		<DocumentCard
			key={fileItem.id}
			kind={fileItem.type}
			variant={props.variant}
			title={title}
			subtitle={subtitle}
			onOpen={() => props.onOpenFile(fileItem.fileRow)}
		/>
	);
}

export function DocumentsContent() {
	const startNewEnvelope = useStartNewEnvelope();
	const {
		viewMode,
		activeTab,
		setActiveTab,
		filteredItems,
		hasAnyContent,
		isLoading,
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
				) : filteredItems.length === 0 ? (
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
				) : (
					<div className="space-y-4">
						{viewMode === "list" ? (
							<div className="space-y-2">
								{filteredItems.map((item) => (
									<DocumentListCard
										key={item.id}
										item={item}
										variant="list"
										onOpenFile={handleFileClick}
										onOpenDraft={handleDraftClick}
										onDeleteDraft={requestDelete}
										deleteDisabled={deletePending}
									/>
								))}
							</div>
						) : (
							<div className="grid grid-cols-2 @md:grid-cols-3 @xl:grid-cols-4 @2xl:grid-cols-5 @3xl:grid-cols-6 @5xl:grid-cols-8 gap-3">
								{filteredItems.map((item) => (
									<DocumentListCard
										key={item.id}
										item={item}
										variant="grid"
										onOpenFile={handleFileClick}
										onOpenDraft={handleDraftClick}
										onDeleteDraft={requestDelete}
										deleteDisabled={deletePending}
									/>
								))}
							</div>
						)}
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
			</MotionReveal>
		</Tabs>
	);
}
