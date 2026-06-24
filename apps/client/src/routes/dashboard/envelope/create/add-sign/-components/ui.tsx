import type { ReactNode } from "react";
import { ViewerChromeSkeleton } from "@/src/lib/components/app/skeletons";
import { ColdShareDialog } from "@/src/lib/domains/invites/-components/cold-share-dialog";
import {
	PlacementProvider,
	useAddSignChrome,
	useAddSignShell,
} from "@/src/lib/domains/placement/context";
import type { PlacementController } from "@/src/lib/domains/placement/types";
import { AddSignHeader } from "@/src/routes/dashboard/envelope/create/add-sign/-components/header";
import { SendProgressDialog } from "@/src/routes/dashboard/envelope/create/add-sign/-components/send-progress-dialog";
import { PdfAcroformImportProvider } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/pdf-acroform-import-context";
import { PlacementCanvasProvider } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/placement-canvas-context";
import { PlacementDndProvider } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/placement-dnd-context";
import FieldsSidebar from "./fields-sidebar";
import MobileToolbar from "./mobile-toolbar";
import { DocumentThumbnailsSidebar } from "./thumbnails";
import DocumentViewer from "./viewer";

function AddSignRoot({
	controller,
	children,
}: {
	controller: PlacementController;
	children: ReactNode;
}) {
	return (
		<PlacementProvider controller={controller}>{children}</PlacementProvider>
	);
}

function AddSignPageShell({ children }: { children: ReactNode }) {
	return (
		<div className="fixed inset-0 flex flex-col overflow-hidden bg-background">
			<PlacementCanvasProvider>
				<PlacementDndProvider>
					<PdfAcroformImportProvider>{children}</PdfAcroformImportProvider>
				</PlacementDndProvider>
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
				<ViewerChromeSkeleton className="min-h-0 flex-1" />
			) : currentDocument ? (
				<DocumentViewer />
			) : (
				<ViewerChromeSkeleton className="min-h-0 flex-1" />
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
		<>
			<SendProgressDialog
				open={chrome.sendProgressOpen}
				state={chrome.sendProgressState}
				envelopeRegisteredInSession={chrome.envelopeRegisteredInSession}
				onRetry={chrome.handleRetrySend}
				onDismiss={chrome.dismissSendProgress}
			/>
			<ColdShareDialog
				open={chrome.postSendDialogOpen}
				share={chrome.postSendShare}
				warmSummary={chrome.postSendWarmSummary}
				incompleteSteps={chrome.postSendIncompleteSteps ?? undefined}
				onDone={chrome.handlePostSendDone}
			/>
		</>
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
