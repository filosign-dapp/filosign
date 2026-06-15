import type { ReactNode } from "react";
import { ViewerChromeSkeleton } from "@/src/lib/components/app/skeletons";
import { DocumentThumbnailsSidebar } from "@/src/routes/dashboard/envelope/create/add-sign/-components/thumbnails";
import DocumentViewer from "@/src/routes/dashboard/envelope/create/add-sign/-components/viewer";
import {
	AddSignProvider,
	useAddSignChrome,
	useAddSignPlacement,
	useAddSignShell,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/context";
import { PlacementCanvasProvider } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/placement-canvas-context";
import { PlacementDndProvider } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/placement-dnd-context";
import type { AddSignController } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-controller";

export type PlacementWorkspaceController = AddSignController;

export function PlacementWorkspaceProvider({
	controller,
	children,
}: {
	controller: PlacementWorkspaceController;
	children: ReactNode;
}) {
	return <AddSignProvider controller={controller}>{children}</AddSignProvider>;
}

export function PlacementWorkspaceShell({ children }: { children: ReactNode }) {
	return (
		<div className="fixed inset-0 flex flex-col overflow-hidden bg-background">
			<PlacementCanvasProvider>
				<PlacementDndProvider>{children}</PlacementDndProvider>
			</PlacementCanvasProvider>
		</div>
	);
}

export function PlacementWorkspaceRow({ children }: { children: ReactNode }) {
	return <div className="flex min-h-0 flex-1 overflow-hidden">{children}</div>;
}

export function PlacementWorkspaceSidebar({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<aside className="hidden h-full min-h-0 w-64 shrink-0 flex-col border-r border-border bg-muted/5 lg:flex">
			{children}
		</aside>
	);
}

export function PlacementWorkspaceViewer() {
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

export function PlacementWorkspaceThumbnails() {
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
			showSupplementaryPackets={false}
		/>
	);
}

export {
	DocumentThumbnailsSidebar,
	DocumentViewer,
	PlacementCanvasProvider,
	PlacementDndProvider,
	useAddSignChrome,
	useAddSignPlacement,
	useAddSignShell,
};
