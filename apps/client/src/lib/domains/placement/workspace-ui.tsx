import type { ReactNode } from "react";
import { ViewerChromeSkeleton } from "@/src/lib/components/app/skeletons";
import {
	PlacementProvider,
	useAddSignChrome,
	useAddSignPlacement,
	useAddSignShell,
} from "@/src/lib/domains/placement/context";
import { PdfAcroformImportProvider } from "@/src/lib/domains/placement/pdf-acroform-import-context";
import type { PlacementController } from "@/src/lib/domains/placement/types";
import { DocumentThumbnailsSidebar } from "@/src/routes/dashboard/envelope/create/add-sign/-components/thumbnails";
import DocumentViewer from "@/src/routes/dashboard/envelope/create/add-sign/-components/viewer";
import { PlacementCanvasProvider } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/placement-canvas-context";
import { PlacementDndProvider } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/placement-dnd-context";

export function PlacementWorkspaceProvider({
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

export function PlacementWorkspaceShell({ children }: { children: ReactNode }) {
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

export function PlacementWorkspaceContextRail({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<aside className="hidden h-full min-h-0 w-72 shrink-0 flex-col border-l border-border bg-muted/5 lg:flex">
			{children}
		</aside>
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
