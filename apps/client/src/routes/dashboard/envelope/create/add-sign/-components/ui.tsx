import type { ReactNode } from "react";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { EntitlementPlanHint } from "@/src/lib/domains/entitlements/entitlement-plan-hint";
import { ColdShareDialog } from "@/src/lib/domains/invites/-components/cold-share-dialog";
import {
	AddSignProvider,
	useAddSignChrome,
	useAddSignContext,
	useAddSignPlacement,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/context";
import type { AddSignController } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-controller";
import FieldsSidebar from "./fields-sidebar";
import Header from "./header";
import MobileToolbar from "./mobile-toolbar";
import { FieldPlacementDialog } from "./placement-dialog";
import { DocumentThumbnailsSidebar } from "./thumbnails";
import DocumentViewer from "./viewer";

function AddSignRoot({
	controller,
	children,
}: {
	controller: AddSignController;
	children: ReactNode;
}) {
	return <AddSignProvider value={controller}>{children}</AddSignProvider>;
}

function AddSignPageShell({ children }: { children: ReactNode }) {
	return (
		<div className="min-h-screen bg-background flex flex-col">{children}</div>
	);
}

function AddSignHeaderRow() {
	return (
		<>
			<Header />
			<div className="px-4 py-2 border-b border-border">
				<EntitlementPlanHint />
			</div>
		</>
	);
}

function AddSignWorkspace({ children }: { children: ReactNode }) {
	return <div className="flex flex-1">{children}</div>;
}

function AddSignFieldsSidebarSlot() {
	return (
		<aside className="hidden lg:block w-64 border-r border-border bg-muted/5">
			<FieldsSidebar />
		</aside>
	);
}

function AddSignViewerSlot() {
	const { persistHydrated, draftReady, currentDocument } = useAddSignContext();
	return (
		<main className="flex-1 flex flex-col bg-background">
			{!persistHydrated || !draftReady ? (
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
	const { documents, currentDocumentId, handleDocumentSelect } =
		useAddSignChrome();
	return (
		<DocumentThumbnailsSidebar
			documents={documents}
			currentDocumentId={currentDocumentId}
			onDocumentSelect={handleDocumentSelect}
		/>
	);
}

function AddSignMobileToolbarSlot() {
	return <MobileToolbar />;
}

function AddSignDialogs() {
	const placement = useAddSignPlacement();
	const chrome = useAddSignChrome();
	return (
		<>
			<FieldPlacementDialog
				open={placement.placementDialogOpen}
				onOpenChange={placement.handlePlacementDialogOpenChange}
				fieldTypeLabel={placement.placementFieldTypeLabel}
				signers={placement.signerOptionsForPlacement}
				onConfirm={placement.handlePlacementConfirm}
			/>
			<ColdShareDialog
				open={chrome.coldShareDialogOpen}
				share={chrome.coldShare}
				onDone={chrome.handleColdShareDone}
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
