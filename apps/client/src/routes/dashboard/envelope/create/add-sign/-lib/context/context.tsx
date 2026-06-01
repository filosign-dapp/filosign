import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { AddSignController } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-controller";

type AddSignShellContextValue = Pick<
	AddSignController,
	| "persistHydrated"
	| "draftReady"
	| "suppressEmptyDraftRedirect"
	| "currentDocument"
	| "docRendering"
	| "setDocRendering"
>;

type AddSignViewerContextValue = Pick<
	AddSignController,
	| "currentDocument"
	| "currentPage"
	| "currentPageFields"
	| "signatureFields"
	| "setCurrentPage"
	| "selectedField"
	| "selectedFieldIds"
	| "isPlacingField"
	| "pendingFieldType"
	| "handlePlaceAtCoords"
	| "handleFieldSelect"
	| "handleCanvasDeselect"
	| "handleFieldRemove"
	| "handleFieldUpdate"
	| "handleFieldDuplicate"
	| "handleRepeatFieldOnAllPages"
	| "handleBack"
	| "handleEditForm"
	| "setPdfLayoutHeight"
	| "recordPdfPageLayout"
	| "setPdfNumPages"
	| "pdfNumPages"
	| "placementDocHeight"
	| "documentLoadingMessage"
	| "isInteractingField"
	| "setIsInteractingField"
	| "fieldFocusRequestId"
	| "clearFieldFocusRequest"
	| "undo"
	| "redo"
	| "canUndo"
	| "canRedo"
>;

type AddSignPlacementContextValue = Pick<
	AddSignController,
	| "handleAddField"
	| "isPlacingField"
	| "pendingFieldType"
	| "placementFieldTypeLabel"
	| "activeAssigneeId"
	| "setActiveAssigneeId"
	| "assignees"
	| "currentPageFields"
	| "selectedField"
	| "selectedFieldIds"
	| "handleFieldSelect"
	| "focusFieldOnCanvas"
	| "handleRepeatFieldOnAllPages"
	| "pdfNumPages"
	| "signatureFields"
	| "currentDocumentId"
	| "currentPage"
>;

type AddSignDndContextValue = Pick<
	AddSignController,
	| "signatureFields"
	| "documentWidth"
	| "documentHeight"
	| "margin"
	| "currentDocumentId"
	| "currentPage"
	| "selectedFieldIds"
	| "placeField"
	| "applyFieldPatches"
	| "handleFieldUpdate"
	| "setSelectedField"
	| "setIsInteractingField"
>;

type AddSignChromeContextValue = Pick<
	AddSignController,
	| "sendStatus"
	| "handleSend"
	| "documents"
	| "currentDocumentId"
	| "handleDocumentSelect"
	| "postSendDialogOpen"
	| "postSendShare"
	| "handlePostSendDone"
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

export function AddSignProvider({
	controller,
	children,
}: {
	controller: AddSignController;
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
			currentPage: controller.currentPage,
			currentPageFields: controller.currentPageFields,
			signatureFields: controller.signatureFields,
			setCurrentPage: controller.setCurrentPage,
			selectedField: controller.selectedField,
			selectedFieldIds: controller.selectedFieldIds,
			isPlacingField: controller.isPlacingField,
			pendingFieldType: controller.pendingFieldType,
			handlePlaceAtCoords: controller.handlePlaceAtCoords,
			handleFieldSelect: controller.handleFieldSelect,
			handleCanvasDeselect: controller.handleCanvasDeselect,
			handleFieldRemove: controller.handleFieldRemove,
			handleFieldUpdate: controller.handleFieldUpdate,
			handleFieldDuplicate: controller.handleFieldDuplicate,
			handleRepeatFieldOnAllPages: controller.handleRepeatFieldOnAllPages,
			handleBack: controller.handleBack,
			handleEditForm: controller.handleEditForm,
			setPdfLayoutHeight: controller.setPdfLayoutHeight,
			recordPdfPageLayout: controller.recordPdfPageLayout,
			setPdfNumPages: controller.setPdfNumPages,
			pdfNumPages: controller.pdfNumPages,
			placementDocHeight: controller.placementDocHeight,
			documentLoadingMessage: controller.documentLoadingMessage,
			isInteractingField: controller.isInteractingField,
			setIsInteractingField: controller.setIsInteractingField,
			fieldFocusRequestId: controller.fieldFocusRequestId,
			clearFieldFocusRequest: controller.clearFieldFocusRequest,
			undo: controller.undo,
			redo: controller.redo,
			canUndo: controller.canUndo,
			canRedo: controller.canRedo,
		}),
		[controller],
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
			currentPageFields: controller.currentPageFields,
			selectedField: controller.selectedField,
			selectedFieldIds: controller.selectedFieldIds,
			handleFieldSelect: controller.handleFieldSelect,
			focusFieldOnCanvas: controller.focusFieldOnCanvas,
			handleRepeatFieldOnAllPages: controller.handleRepeatFieldOnAllPages,
			pdfNumPages: controller.pdfNumPages,
			signatureFields: controller.signatureFields,
			currentDocumentId: controller.currentDocumentId,
			currentPage: controller.currentPage,
		}),
		[controller],
	);

	const dndValue = useMemo(
		(): AddSignDndContextValue => ({
			signatureFields: controller.signatureFields,
			documentWidth: controller.documentWidth,
			documentHeight: controller.documentHeight,
			margin: controller.margin,
			currentDocumentId: controller.currentDocumentId,
			currentPage: controller.currentPage,
			selectedFieldIds: controller.selectedFieldIds,
			placeField: controller.placeField,
			applyFieldPatches: controller.applyFieldPatches,
			handleFieldUpdate: controller.handleFieldUpdate,
			setSelectedField: controller.setSelectedField,
			setIsInteractingField: controller.setIsInteractingField,
		}),
		[controller],
	);

	const chromeValue = useMemo(
		(): AddSignChromeContextValue => ({
			sendStatus: controller.sendStatus,
			handleSend: controller.handleSend,
			documents: controller.documents,
			currentDocumentId: controller.currentDocumentId,
			handleDocumentSelect: controller.handleDocumentSelect,
			postSendDialogOpen: controller.postSendDialogOpen,
			postSendShare: controller.postSendShare,
			handlePostSendDone: controller.handlePostSendDone,
		}),
		[controller],
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
		throw new Error("useAddSignShellContext requires AddSignProvider");
	}
	return ctx;
}

function useAddSignViewerContext(): AddSignViewerContextValue {
	const ctx = useContext(AddSignViewerContext);
	if (!ctx) {
		throw new Error("useAddSignViewerContext requires AddSignProvider");
	}
	return ctx;
}

function useAddSignPlacementContext(): AddSignPlacementContextValue {
	const ctx = useContext(AddSignPlacementContext);
	if (!ctx) {
		throw new Error("useAddSignPlacementContext requires AddSignProvider");
	}
	return ctx;
}

function useAddSignDndContext(): AddSignDndContextValue {
	const ctx = useContext(AddSignDndContext);
	if (!ctx) {
		throw new Error("useAddSignDndContext requires AddSignProvider");
	}
	return ctx;
}

function useAddSignChromeContext(): AddSignChromeContextValue {
	const ctx = useContext(AddSignChromeContext);
	if (!ctx) {
		throw new Error("useAddSignChromeContext requires AddSignProvider");
	}
	return ctx;
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

export function useAddSignDnd() {
	return useAddSignDndContext();
}

/** Combined context for DnD + viewer wiring. */
export function useAddSignContext() {
	return useAddSignDndContext();
}
