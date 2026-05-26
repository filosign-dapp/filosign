import { createContext, useContext, useMemo } from "react";
import type { AddSignController } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-controller";

const AddSignContext = createContext<AddSignController | null>(null);

export function AddSignProvider({
	value,
	children,
}: {
	value: AddSignController;
	children: React.ReactNode;
}) {
	return (
		<AddSignContext.Provider value={value}>{children}</AddSignContext.Provider>
	);
}

export function useAddSignContext(): AddSignController {
	const context = useContext(AddSignContext);
	if (!context) {
		throw new Error("useAddSignContext must be used within AddSignProvider");
	}
	return context;
}

/** Field placement mode shared by viewer, desktop sidebar, and mobile toolbar. */
export function useAddSignPlacement() {
	const {
		handleAddField,
		isPlacingField,
		pendingFieldType,
		placementDialogOpen,
		placementFieldTypeLabel,
		signerOptionsForPlacement,
		handlePlacementDialogOpenChange,
		handlePlacementConfirm,
	} = useAddSignContext();
	return useMemo(
		() => ({
			handleAddField,
			isPlacingField,
			pendingFieldType,
			placementDialogOpen,
			placementFieldTypeLabel,
			signerOptionsForPlacement,
			handlePlacementDialogOpenChange,
			handlePlacementConfirm,
		}),
		[
			handleAddField,
			isPlacingField,
			pendingFieldType,
			placementDialogOpen,
			placementFieldTypeLabel,
			signerOptionsForPlacement,
			handlePlacementDialogOpenChange,
			handlePlacementConfirm,
		],
	);
}

/** Document viewer + field overlay state. */
export function useAddSignViewer() {
	const {
		currentDocument,
		currentPage,
		currentPageFields,
		zoom,
		setZoom,
		setCurrentPage,
		selectedField,
		isPlacingField,
		pendingFieldType,
		handleFieldPlacementRequest,
		handleFieldSelect,
		handleFieldRemove,
		handleFieldUpdate,
		handleBack,
		setPdfLayoutHeight,
		placementDocHeight,
	} = useAddSignContext();
	return useMemo(
		() => ({
			currentDocument,
			currentPage,
			currentPageFields,
			zoom,
			setZoom,
			setCurrentPage,
			selectedField,
			isPlacingField,
			pendingFieldType,
			handleFieldPlacementRequest,
			handleFieldSelect,
			handleFieldRemove,
			handleFieldUpdate,
			handleBack,
			setPdfLayoutHeight,
			placementDocHeight,
		}),
		[
			currentDocument,
			currentPage,
			currentPageFields,
			zoom,
			setZoom,
			setCurrentPage,
			selectedField,
			isPlacingField,
			pendingFieldType,
			handleFieldPlacementRequest,
			handleFieldSelect,
			handleFieldRemove,
			handleFieldUpdate,
			handleBack,
			setPdfLayoutHeight,
			placementDocHeight,
		],
	);
}

export function useAddSignChrome() {
	const {
		sendStatus,
		handleSend,
		documents,
		currentDocumentId,
		handleDocumentSelect,
		postSendDialogOpen,
		postSendShare,
		handlePostSendDone,
	} = useAddSignContext();
	return useMemo(
		() => ({
			sendStatus,
			handleSend,
			documents,
			currentDocumentId,
			handleDocumentSelect,
			postSendDialogOpen,
			postSendShare,
			handlePostSendDone,
		}),
		[
			sendStatus,
			handleSend,
			documents,
			currentDocumentId,
			handleDocumentSelect,
			postSendDialogOpen,
			postSendShare,
			handlePostSendDone,
		],
	);
}
