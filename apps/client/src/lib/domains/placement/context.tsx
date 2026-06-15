import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { PlacementController } from "@/src/lib/domains/placement/types";

type AddSignShellContextValue = Pick<
	PlacementController,
	| "persistHydrated"
	| "draftReady"
	| "suppressEmptyDraftRedirect"
	| "currentDocument"
	| "docRendering"
	| "setDocRendering"
>;

type AddSignViewerContextValue = Pick<
	PlacementController,
	| "currentDocument"
	| "signatureFields"
	| "selectedFieldIds"
	| "isPlacingField"
	| "pendingFieldType"
	| "handlePlaceAtCoords"
	| "handleFieldSelect"
	| "handleMarqueeSelect"
	| "handleCanvasDeselect"
	| "handleFieldRemove"
	| "handleFieldUpdate"
	| "handleFieldDuplicate"
	| "recordPdfPageLayout"
	| "setPdfNumPages"
	| "pdfNumPages"
	| "getPageHeight"
	| "documentLoadingMessage"
	| "isInteractingField"
	| "setIsInteractingField"
	| "fieldFocusRequestId"
	| "clearFieldFocusRequest"
	| "resolvePlacementFieldSize"
>;

type AddSignPlacementContextValue = Pick<
	PlacementController,
	| "handleAddField"
	| "isPlacingField"
	| "pendingFieldType"
	| "placementFieldTypeLabel"
	| "activeAssigneeId"
	| "setActiveAssigneeId"
	| "assignees"
	| "currentDocumentFields"
	| "currentDocument"
	| "selectedFieldIds"
	| "focusFieldOnCanvas"
	| "handleClearAllFields"
	| "signatureFields"
	| "currentPage"
>;

type AddSignDndContextValue = Pick<
	PlacementController,
	| "signatureFields"
	| "documentWidth"
	| "margin"
	| "currentDocumentId"
	| "getPageHeight"
	| "selectedFieldIds"
	| "placeField"
	| "applyFieldPatches"
	| "handleFieldUpdate"
	| "setSelectedField"
	| "setIsInteractingField"
	| "resolvePlacementFieldSize"
>;

type AddSignChromeContextValue = Pick<
	PlacementController,
	| "sendStatus"
	| "handleSend"
	| "documents"
	| "currentDocumentId"
	| "handleDocumentSelect"
	| "signatureFields"
	| "postSendDialogOpen"
	| "postSendShare"
	| "postSendWarmSummary"
	| "handlePostSendDone"
	| "sendProgressOpen"
	| "sendProgressState"
	| "dismissSendProgress"
	| "undo"
	| "redo"
	| "canUndo"
	| "canRedo"
>;

const AddSignShellContext = createContext<AddSignShellContextValue | null>(
	null,
);
const AddSignViewerContext = createContext<AddSignViewerContextValue | null>(
	null,
);
const AddSignPlacementContext =
	createContext<AddSignPlacementContextValue | null>(null);
const AddSignDndContext = createContext<AddSignDndContextValue | null>(null);
const AddSignChromeContext = createContext<AddSignChromeContextValue | null>(
	null,
);

export function PlacementProvider({
	controller,
	children,
}: {
	controller: PlacementController;
	children: ReactNode;
}) {
	const shellValue = useMemo(
		(): AddSignShellContextValue => ({
			persistHydrated: controller.persistHydrated,
			draftReady: controller.draftReady,
			suppressEmptyDraftRedirect: controller.suppressEmptyDraftRedirect,
			currentDocument: controller.currentDocument,
			docRendering: controller.docRendering,
			setDocRendering: controller.setDocRendering,
		}),
		[
			controller.persistHydrated,
			controller.draftReady,
			controller.suppressEmptyDraftRedirect,
			controller.currentDocument,
			controller.docRendering,
			controller.setDocRendering,
		],
	);

	const viewerValue = useMemo(
		(): AddSignViewerContextValue => ({
			currentDocument: controller.currentDocument,
			signatureFields: controller.signatureFields,
			selectedFieldIds: controller.selectedFieldIds,
			isPlacingField: controller.isPlacingField,
			pendingFieldType: controller.pendingFieldType,
			handlePlaceAtCoords: controller.handlePlaceAtCoords,
			handleFieldSelect: controller.handleFieldSelect,
			handleMarqueeSelect: controller.handleMarqueeSelect,
			handleCanvasDeselect: controller.handleCanvasDeselect,
			handleFieldRemove: controller.handleFieldRemove,
			handleFieldUpdate: controller.handleFieldUpdate,
			handleFieldDuplicate: controller.handleFieldDuplicate,
			recordPdfPageLayout: controller.recordPdfPageLayout,
			setPdfNumPages: controller.setPdfNumPages,
			pdfNumPages: controller.pdfNumPages,
			getPageHeight: controller.getPageHeight,
			documentLoadingMessage: controller.documentLoadingMessage,
			isInteractingField: controller.isInteractingField,
			setIsInteractingField: controller.setIsInteractingField,
			fieldFocusRequestId: controller.fieldFocusRequestId,
			clearFieldFocusRequest: controller.clearFieldFocusRequest,
			resolvePlacementFieldSize: controller.resolvePlacementFieldSize,
		}),
		[
			controller.currentDocument,
			controller.signatureFields,
			controller.selectedFieldIds,
			controller.isPlacingField,
			controller.pendingFieldType,
			controller.handlePlaceAtCoords,
			controller.handleFieldSelect,
			controller.handleMarqueeSelect,
			controller.handleCanvasDeselect,
			controller.handleFieldRemove,
			controller.handleFieldUpdate,
			controller.handleFieldDuplicate,
			controller.recordPdfPageLayout,
			controller.setPdfNumPages,
			controller.pdfNumPages,
			controller.getPageHeight,
			controller.documentLoadingMessage,
			controller.isInteractingField,
			controller.setIsInteractingField,
			controller.fieldFocusRequestId,
			controller.clearFieldFocusRequest,
			controller.resolvePlacementFieldSize,
		],
	);

	const placementValue = useMemo(
		(): AddSignPlacementContextValue => ({
			handleAddField: controller.handleAddField,
			isPlacingField: controller.isPlacingField,
			pendingFieldType: controller.pendingFieldType,
			placementFieldTypeLabel: controller.placementFieldTypeLabel,
			activeAssigneeId: controller.activeAssigneeId,
			setActiveAssigneeId: controller.setActiveAssigneeId,
			assignees: controller.assignees,
			currentDocumentFields: controller.currentDocumentFields,
			currentDocument: controller.currentDocument,
			selectedFieldIds: controller.selectedFieldIds,
			focusFieldOnCanvas: controller.focusFieldOnCanvas,
			handleClearAllFields: controller.handleClearAllFields,
			signatureFields: controller.signatureFields,
			currentPage: controller.currentPage,
		}),
		[
			controller.handleAddField,
			controller.isPlacingField,
			controller.pendingFieldType,
			controller.placementFieldTypeLabel,
			controller.activeAssigneeId,
			controller.setActiveAssigneeId,
			controller.assignees,
			controller.currentDocumentFields,
			controller.currentDocument,
			controller.selectedFieldIds,
			controller.focusFieldOnCanvas,
			controller.handleClearAllFields,
			controller.signatureFields,
			controller.currentPage,
		],
	);

	const dndValue = useMemo(
		(): AddSignDndContextValue => ({
			signatureFields: controller.signatureFields,
			documentWidth: controller.documentWidth,
			margin: controller.margin,
			currentDocumentId: controller.currentDocumentId,
			getPageHeight: controller.getPageHeight,
			selectedFieldIds: controller.selectedFieldIds,
			placeField: controller.placeField,
			applyFieldPatches: controller.applyFieldPatches,
			handleFieldUpdate: controller.handleFieldUpdate,
			setSelectedField: controller.setSelectedField,
			setIsInteractingField: controller.setIsInteractingField,
			resolvePlacementFieldSize: controller.resolvePlacementFieldSize,
		}),
		[
			controller.signatureFields,
			controller.documentWidth,
			controller.margin,
			controller.currentDocumentId,
			controller.getPageHeight,
			controller.selectedFieldIds,
			controller.placeField,
			controller.applyFieldPatches,
			controller.handleFieldUpdate,
			controller.setSelectedField,
			controller.setIsInteractingField,
			controller.resolvePlacementFieldSize,
		],
	);

	const chromeValue = useMemo(
		(): AddSignChromeContextValue => ({
			sendStatus: controller.sendStatus,
			handleSend: controller.handleSend,
			documents: controller.documents,
			currentDocumentId: controller.currentDocumentId,
			handleDocumentSelect: controller.handleDocumentSelect,
			signatureFields: controller.signatureFields,
			postSendDialogOpen: controller.postSendDialogOpen,
			postSendShare: controller.postSendShare,
			postSendWarmSummary: controller.postSendWarmSummary,
			handlePostSendDone: controller.handlePostSendDone,
			sendProgressOpen: controller.sendProgressOpen,
			sendProgressState: controller.sendProgressState,
			dismissSendProgress: controller.dismissSendProgress,
			undo: controller.undo,
			redo: controller.redo,
			canUndo: controller.canUndo,
			canRedo: controller.canRedo,
		}),
		[
			controller.sendStatus,
			controller.handleSend,
			controller.documents,
			controller.currentDocumentId,
			controller.handleDocumentSelect,
			controller.signatureFields,
			controller.postSendDialogOpen,
			controller.postSendShare,
			controller.postSendWarmSummary,
			controller.handlePostSendDone,
			controller.sendProgressOpen,
			controller.sendProgressState,
			controller.dismissSendProgress,
			controller.undo,
			controller.redo,
			controller.canUndo,
			controller.canRedo,
		],
	);

	return (
		<AddSignShellContext.Provider value={shellValue}>
			<AddSignViewerContext.Provider value={viewerValue}>
				<AddSignPlacementContext.Provider value={placementValue}>
					<AddSignDndContext.Provider value={dndValue}>
						<AddSignChromeContext.Provider value={chromeValue}>
							{children}
						</AddSignChromeContext.Provider>
					</AddSignDndContext.Provider>
				</AddSignPlacementContext.Provider>
			</AddSignViewerContext.Provider>
		</AddSignShellContext.Provider>
	);
}

function useAddSignShellContext(): AddSignShellContextValue {
	const ctx = useContext(AddSignShellContext);
	if (!ctx) {
		throw new Error("useAddSignShellContext requires PlacementProvider");
	}
	return ctx;
}

function useAddSignViewerContext(): AddSignViewerContextValue {
	const ctx = useContext(AddSignViewerContext);
	if (!ctx) {
		throw new Error("useAddSignViewerContext requires PlacementProvider");
	}
	return ctx;
}

function useAddSignPlacementContext(): AddSignPlacementContextValue {
	const ctx = useContext(AddSignPlacementContext);
	if (!ctx) {
		throw new Error("useAddSignPlacementContext requires PlacementProvider");
	}
	return ctx;
}

function useAddSignDndContext(): AddSignDndContextValue {
	const ctx = useContext(AddSignDndContext);
	if (!ctx) {
		throw new Error("useAddSignDndContext requires PlacementProvider");
	}
	return ctx;
}

function useAddSignChromeContext(): AddSignChromeContextValue {
	const ctx = useContext(AddSignChromeContext);
	if (!ctx) {
		throw new Error("useAddSignChromeContext requires PlacementProvider");
	}
	return ctx;
}

export function useAddSignDnd() {
	return useAddSignDndContext();
}

export function useAddSignPlacement() {
	return useAddSignPlacementContext();
}

export function useAddSignViewer() {
	return useAddSignViewerContext();
}

export function useAddSignChrome() {
	return useAddSignChromeContext();
}

export function useAddSignShell() {
	return useAddSignShellContext();
}
