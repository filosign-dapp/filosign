import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { AddSignController } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-controller";

type AddSignShellContextValue = Pick<
	AddSignController,
	| "persistHydrated"
	| "draftReady"
	| "suppressEmptyDraftRedirect"
	| "currentDocument"
>;

type AddSignViewerContextValue = Pick<
	AddSignController,
	| "currentDocument"
	| "currentPage"
	| "currentPageFields"
	| "zoom"
	| "setZoom"
	| "setCurrentPage"
	| "selectedField"
	| "isPlacingField"
	| "pendingFieldType"
	| "handleFieldPlacementRequest"
	| "handleFieldSelect"
	| "handleFieldRemove"
	| "handleFieldUpdate"
	| "handleBack"
	| "setPdfLayoutHeight"
	| "placementDocHeight"
>;

type AddSignPlacementContextValue = Pick<
	AddSignController,
	| "handleAddField"
	| "isPlacingField"
	| "pendingFieldType"
	| "placementDialogOpen"
	| "placementFieldTypeLabel"
	| "signerOptionsForPlacement"
	| "handlePlacementDialogOpenChange"
	| "handlePlacementConfirm"
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
		}),
		[
			controller.persistHydrated,
			controller.draftReady,
			controller.suppressEmptyDraftRedirect,
			controller.currentDocument,
		],
	);

	const viewerValue = useMemo(
		(): AddSignViewerContextValue => ({
			currentDocument: controller.currentDocument,
			currentPage: controller.currentPage,
			currentPageFields: controller.currentPageFields,
			zoom: controller.zoom,
			setZoom: controller.setZoom,
			setCurrentPage: controller.setCurrentPage,
			selectedField: controller.selectedField,
			isPlacingField: controller.isPlacingField,
			pendingFieldType: controller.pendingFieldType,
			handleFieldPlacementRequest: controller.handleFieldPlacementRequest,
			handleFieldSelect: controller.handleFieldSelect,
			handleFieldRemove: controller.handleFieldRemove,
			handleFieldUpdate: controller.handleFieldUpdate,
			handleBack: controller.handleBack,
			setPdfLayoutHeight: controller.setPdfLayoutHeight,
			placementDocHeight: controller.placementDocHeight,
		}),
		[
			controller.currentDocument,
			controller.currentPage,
			controller.currentPageFields,
			controller.zoom,
			controller.setZoom,
			controller.setCurrentPage,
			controller.selectedField,
			controller.isPlacingField,
			controller.pendingFieldType,
			controller.handleFieldPlacementRequest,
			controller.handleFieldSelect,
			controller.handleFieldRemove,
			controller.handleFieldUpdate,
			controller.handleBack,
			controller.setPdfLayoutHeight,
			controller.placementDocHeight,
		],
	);

	const placementValue = useMemo(
		(): AddSignPlacementContextValue => ({
			handleAddField: controller.handleAddField,
			isPlacingField: controller.isPlacingField,
			pendingFieldType: controller.pendingFieldType,
			placementDialogOpen: controller.placementDialogOpen,
			placementFieldTypeLabel: controller.placementFieldTypeLabel,
			signerOptionsForPlacement: controller.signerOptionsForPlacement,
			handlePlacementDialogOpenChange:
				controller.handlePlacementDialogOpenChange,
			handlePlacementConfirm: controller.handlePlacementConfirm,
		}),
		[
			controller.handleAddField,
			controller.isPlacingField,
			controller.pendingFieldType,
			controller.placementDialogOpen,
			controller.placementFieldTypeLabel,
			controller.signerOptionsForPlacement,
			controller.handlePlacementDialogOpenChange,
			controller.handlePlacementConfirm,
		],
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
		[
			controller.sendStatus,
			controller.handleSend,
			controller.documents,
			controller.currentDocumentId,
			controller.handleDocumentSelect,
			controller.postSendDialogOpen,
			controller.postSendShare,
			controller.handlePostSendDone,
		],
	);

	return (
		<AddSignShellContext.Provider value={shellValue}>
			<AddSignViewerContext.Provider value={viewerValue}>
				<AddSignPlacementContext.Provider value={placementValue}>
					<AddSignChromeContext.Provider value={chromeValue}>
						{children}
					</AddSignChromeContext.Provider>
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
