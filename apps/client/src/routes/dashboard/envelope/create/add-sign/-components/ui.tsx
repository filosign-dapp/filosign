import type { ReactNode } from "react";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { ColdShareDialog } from "@/src/lib/domains/invites/-components/cold-share-dialog";
import { AddSignHeader } from "@/src/routes/dashboard/envelope/create/add-sign/-components/header";
import {
	AddSignProvider,
	useAddSignChrome,
	useAddSignShell,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/context";
import { PlacementCanvasProvider } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/placement-canvas-context";
import { PlacementDndProvider } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/placement-dnd-context";
import type { AddSignController } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-controller";
import FieldsSidebar from "./fields-sidebar";
import MobileToolbar from "./mobile-toolbar";
import { DocumentThumbnailsSidebar } from "./thumbnails";
import DocumentViewer from "./viewer";

function AddSignRoot({
	controller,
	children,
}: {
	controller: AddSignController;
	children: ReactNode;
}) {
	return <AddSignProvider controller={controller}>{children}</AddSignProvider>;
}

function AddSignPageShell({ children }: { children: ReactNode }) {
	return (
		<div className="fixed inset-0 flex flex-col overflow-hidden bg-background">
			<PlacementCanvasProvider>
				<PlacementDndProvider>{children}</PlacementDndProvider>
			</PlacementCanvasProvider>
		</div>
	);
}

function AddSignHeaderRow() {
	return <AddSignHeader />;
}

function AddSignWorkspace({ children }: { children: ReactNode }) {
	return <div className="flex min-h-0 flex-1 overflow-hidden">{children}</div>;
}

function AddSignFieldsSidebarSlot() {
	return (
		<aside className="hidden h-full min-h-0 w-64 shrink-0 flex-col border-r border-border bg-muted/5 lg:flex">
			<FieldsSidebar />
		</aside>
	);
}

function AddSignViewerSlot() {
	const {
		persistHydrated,
		draftReady,
		suppressEmptyDraftRedirect,
		currentDocument,
	} = useAddSignShell();
	const showViewer =
		persistHydrated && (draftReady || suppressEmptyDraftRedirect);
	return (
		<main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
			{!showViewer ? (
				<div className="flex flex-1 items-center justify-center">
					<InlineLoader size="lg" />
				</div>
			) : currentDocument ? (
				<DocumentViewer />
			) : (
				<div className="flex flex-1 items-center justify-center">
					<InlineLoader size="lg" />
				</div>
			)}
		</main>
	);
}

function AddSignThumbnailsSlot() {
	const {
		documents,
		currentDocumentId,
		handleDocumentSelect,
		signatureFields,
	} = useAddSignChrome();
	return (
		<DocumentThumbnailsSidebar
			documents={documents}
			currentDocumentId={currentDocumentId}
			signatureFields={signatureFields}
			onDocumentSelect={handleDocumentSelect}
		/>
	);
}

function AddSignMobileToolbarSlot() {
	return <MobileToolbar />;
}

function AddSignDialogs() {
	const chrome = useAddSignChrome();
	return (
		<ColdShareDialog
			open={chrome.postSendDialogOpen}
			share={chrome.postSendShare}
			warmSummary={chrome.postSendWarmSummary}
			onDone={chrome.handlePostSendDone}
		/>
	);
}

export const AddSign = {
	Root: AddSignRoot,
	Shell: AddSignPageShell,
	HeaderRow: AddSignHeaderRow,
	Workspace: AddSignWorkspace,
	FieldsSidebar: AddSignFieldsSidebarSlot,
	Viewer: AddSignViewerSlot,
	Thumbnails: AddSignThumbnailsSlot,
	MobileToolbar: AddSignMobileToolbarSlot,
	Dialogs: AddSignDialogs,
};
