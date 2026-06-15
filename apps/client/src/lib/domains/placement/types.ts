import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";
import type { PlacementFieldType } from "@/src/lib/domains/files/field-box";
import type {
	ColdSharePackage,
	WarmShareSummary,
} from "@/src/lib/domains/invites/types";
import type { ActiveAssignee } from "./utils/active-assignees";

export type { SignatureField };

import type {
	WorkflowProgressState as SendProgressState,
	WorkflowProgressStep as SendProgressStep,
} from "@/src/lib/domains/workflow-progress";

export type { SendProgressState, SendProgressStep };

export type PlacementDocument = {
	id: string;
	name: string;
	mimeType: string;
	url: string;
	pdfBytes?: Uint8Array;
	pages: number;
};

export type SendChromeSlice = {
	sendStatus: "idle" | "loading" | "signing" | "success" | "error";
	postSendDialogOpen: boolean;
	postSendShare: ColdSharePackage | null;
	postSendWarmSummary: WarmShareSummary | null;
	sendProgressOpen: boolean;
	sendProgressState: SendProgressState | null;
	dismissSendProgress: () => void;
	handleSend: () => void | Promise<void>;
	handlePostSendDone: () => void;
};

export type PlacementControllerCore = {
	persistHydrated: boolean;
	draftReady: boolean;
	documents: PlacementDocument[];
	currentDocument: PlacementDocument | undefined;
	currentDocumentId: string;
	currentPage: number;
	currentDocumentFields: SignatureField[];
	signatureFields: SignatureField[];
	setCurrentPage: (page: number) => void;
	suppressEmptyDraftRedirect: boolean;
	selectedField: string | null;
	selectedFieldIds: Set<string>;
	isPlacingField: boolean;
	pendingFieldType: SignatureField["type"] | null;
	placementFieldTypeLabel: string;
	activeAssigneeId: string;
	setActiveAssigneeId: (id: string) => void;
	assignees: ActiveAssignee[];
	isInteractingField: boolean;
	setIsInteractingField: (value: boolean) => void;
	docRendering: boolean;
	setDocRendering: (value: boolean) => void;
	documentWidth: number;
	documentHeight: number;
	margin: number;
	pdfNumPages: number | null;
	setPdfNumPages: (value: number | null) => void;
	recordPdfPageLayout: (page: number, height: number) => void;
	getPageHeight: (page: number) => number;
	fieldFocusRequestId: string | null;
	clearFieldFocusRequest: () => void;
	focusFieldOnCanvas: (fieldId: string) => void;
	handleClearAllFields: () => void;
	applyFieldPatches: (patches: Map<string, Partial<SignatureField>>) => void;
	handleAddField: (type: SignatureField["type"]) => void;
	placeField: (args: {
		type: SignatureField["type"];
		x: number;
		y: number;
		page?: number;
	}) => string | null;
	handlePlaceAtCoords: (coords: { x: number; y: number; page: number }) => void;
	handleFieldSelect: (
		fieldId: string,
		options?: { additive?: boolean },
	) => void;
	handleMarqueeSelect: (fieldIds: string[], additive: boolean) => void;
	handleCanvasDeselect: () => void;
	handleFieldRemove: (fieldId: string) => void;
	handleFieldUpdate: (
		fieldId: string,
		updates: Partial<SignatureField>,
	) => void;
	handleFieldDuplicate: (fieldId: string) => void;
	handleDocumentSelect: (documentId: string) => void;
	documentLoadingMessage: string | null;
	undo: () => void;
	redo: () => void;
	canUndo: boolean;
	canRedo: boolean;
	setSelectedField: (fieldId: string | null) => void;
	resolvePlacementFieldSize: (type: PlacementFieldType) => {
		width: number;
		height: number;
	};
};

export type PlacementController = PlacementControllerCore & SendChromeSlice;

export type PlacementWorkspaceController = PlacementController;

export type ClickCoordinates = {
	clientX: number;
	clientY: number;
};
