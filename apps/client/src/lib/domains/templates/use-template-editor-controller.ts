import { useCryptoUnlocked } from "@filosign/react/auth";
import { useUserProfile } from "@filosign/react/users";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import {
	pruneSignatureFields,
	useDraftDocumentPreview,
} from "@/src/lib/domains/drafts";
import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";
import { normalizeSignatureFieldsList } from "@/src/lib/domains/files/field-box";
import type {
	ColdSharePackage,
	WarmShareSummary,
} from "@/src/lib/domains/invites/types";
import { useTemplateEditorHydrate } from "@/src/lib/domains/templates/use-template-editor-hydrate";
import {
	useStorePersist,
	useStorePersistHydrated,
} from "@/src/lib/filosign/use-store";
import type { AddSignController } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-controller";
import { useDocumentDimensions } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-dimensions";
import { useAddSignFields } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-fields";
import { usePlacementHistory } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-placement-history";
import { usePlacementMode } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-placement-mode";
import type { Document } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";
import {
	buildActiveAssignees,
	resolveActiveAssignee,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/active-assignees";
import { signatureFieldPalette } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/field-types";
import { sortPlacedFields } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/placed-fields";
import { SELF_ASSIGNEE_ID } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/placement-coordinates";
import {
	type PlacementFieldPresetStore,
	rememberPlacementFieldSize,
	resolvePlacementFieldSize,
	seedPlacementFieldPresetsFromFields,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/placement-field-presets";
import type { SendProgressState } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/progress";

export type TemplateEditorControllerArgs = {
	mode: "create" | "edit";
	templateId: string;
};

export function useTemplateEditorController(
	args: TemplateEditorControllerArgs,
): AddSignController {
	const navigate = useNavigate();
	const cryptoUnlocked = useCryptoUnlocked();
	const { templateEditorLoadState } = useTemplateEditorHydrate({
		templateMode: args.mode === "edit" ? "edit" : undefined,
		templateId: args.mode === "edit" ? args.templateId : undefined,
		cryptoReady: cryptoUnlocked.data === true,
	});
	const createForm = useStorePersist((s) => s.createForm);
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const persistHydrated = useStorePersistHydrated();
	const draftReady = Boolean(createForm?.documents?.length);
	const { documentUrls, documentPdfBytes } = useDraftDocumentPreview({
		createForm,
		draftSyncMode: "local",
		serverDraftLoadState: "idle",
	});
	const {
		width: docWidth,
		height: docHeight,
		margin,
		isMobile,
	} = useDocumentDimensions();
	const [pdfLayoutHeight, setPdfLayoutHeight] = useState<number | null>(null);
	const [pdfNumPages, setPdfNumPages] = useState<number | null>(null);
	const pageHeightsRef = useRef<Map<number, number>>(new Map());
	const fieldSizePresetsRef = useRef<PlacementFieldPresetStore>(new Map());
	const [fieldFocusRequestId, setFieldFocusRequestId] = useState<string | null>(
		null,
	);
	const placementDocHeight = pdfLayoutHeight ?? docHeight;
	const [currentDocumentId, setCurrentDocumentId] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [activeAssigneeId, setActiveAssigneeId] =
		useState<string>(SELF_ASSIGNEE_ID);
	const [isInteractingField, setIsInteractingField] = useState(false);
	const [docRendering, setDocRendering] = useState(false);
	const { data: selfProfile } = useUserProfile();
	const [sendStatus] = useState<
		"idle" | "loading" | "signing" | "success" | "error"
	>("idle");
	const [postSendDialogOpen] = useState(false);
	const [postSendShare] = useState<ColdSharePackage | null>(null);
	const [postSendWarmSummary] = useState<WarmShareSummary | null>(null);
	const [sendProgressOpen] = useState(false);
	const [sendProgressState] = useState<SendProgressState | null>(null);

	const suppressEmptyDraftRedirect =
		templateEditorLoadState === "loading" ||
		templateEditorLoadState === "awaiting_crypto" ||
		!draftReady;

	const signatureFields = useMemo(
		() =>
			createForm
				? pruneSignatureFields(
						createForm.signatureFields ?? [],
						createForm.recipients,
					)
				: [],
		[createForm],
	);

	const handleSignatureFieldsChange = useCallback(
		(fields: SignatureField[]) => {
			const prev = useStorePersist.getState().createForm;
			if (!prev) return;
			setCreateForm({ ...prev, signatureFields: fields });
		},
		[setCreateForm],
	);

	const { commitFields, undo, redo, canUndo, canRedo } = usePlacementHistory(
		signatureFields,
		handleSignatureFieldsChange,
	);

	const resolveFieldSize = useCallback(
		(type: SignatureField["type"]) =>
			resolvePlacementFieldSize({
				type,
				isMobile,
				presets: fieldSizePresetsRef.current,
			}),
		[isMobile],
	);

	const {
		placeField: placeFieldRaw,
		handleFieldUpdate: handleFieldUpdateRaw,
		handleFieldRemove: handleFieldRemoveRaw,
		handleBulkFieldUpdate,
		handleBulkFieldRemove,
		handleFieldDuplicate,
		applyFieldPatches,
	} = useAddSignFields(commitFields, signatureFields, resolveFieldSize);

	const rememberFieldSize = useCallback(
		(type: SignatureField["type"], size: { width: number; height: number }) => {
			rememberPlacementFieldSize(fieldSizePresetsRef.current, type, size);
		},
		[],
	);

	const {
		selectedFieldIds,
		selectedField,
		isPlacingField,
		pendingFieldType,
		setSelectedField,
		setSelectedFieldIds,
		selectField,
		selectFields,
		clearFieldSelection,
		handleAddField,
		cancelPlacement,
		finishPlacement,
	} = usePlacementMode();

	const assignees = useMemo(
		() => buildActiveAssignees(createForm?.recipients ?? [], selfProfile),
		[createForm?.recipients, selfProfile],
	);

	useEffect(() => {
		if (assignees.length === 0) return;
		const current = assignees.find((a) => a.id === activeAssigneeId);
		if (current?.placementEnabled) return;
		const firstEnabled = assignees.find((a) => a.placementEnabled);
		if (firstEnabled) {
			setActiveAssigneeId(firstEnabled.id);
		}
	}, [assignees, activeAssigneeId]);

	useEffect(() => {
		if (!createForm?.signatureFields?.length) return;
		const normalized = normalizeSignatureFieldsList(
			createForm.signatureFields,
			isMobile,
		);
		const changed = normalized.some(
			(f, i) =>
				f.width !== createForm.signatureFields[i]?.width ||
				f.height !== createForm.signatureFields[i]?.height,
		);
		if (changed) {
			setCreateForm({ ...createForm, signatureFields: normalized });
		}
	}, [createForm, isMobile, setCreateForm]);

	const placeField = useCallback(
		(args: {
			type: SignatureField["type"];
			x: number;
			y: number;
			page?: number;
		}) => {
			const assignee = resolveActiveAssignee(assignees, activeAssigneeId);
			if (!assignee || !currentDocumentId) return null;
			if (!assignee.placementEnabled) {
				toastUser.error(TOASTS.send.selfSignToggleRequired.title, {
					hint: TOASTS.send.selfSignToggleRequired.hint,
				});
				return null;
			}
			const id = placeFieldRaw({
				type: args.type,
				x: args.x,
				y: args.y,
				documentId: currentDocumentId,
				page: args.page ?? currentPage,
				assignee,
			});
			if (id && isPlacingField && pendingFieldType === args.type) {
				finishPlacement(id);
			}
			return id;
		},
		[
			assignees,
			activeAssigneeId,
			currentDocumentId,
			currentPage,
			isPlacingField,
			pendingFieldType,
			placeFieldRaw,
			finishPlacement,
		],
	);

	const handleFieldUpdate = useCallback(
		(fieldId: string, updates: Partial<SignatureField>) => {
			const field = signatureFields.find((f) => f.id === fieldId);
			handleFieldUpdateRaw(fieldId, updates);
			if (!field) return;
			if (updates.width === undefined && updates.height === undefined) return;
			rememberFieldSize(field.type, {
				width: updates.width ?? field.width,
				height: updates.height ?? field.height,
			});
		},
		[handleFieldUpdateRaw, signatureFields, rememberFieldSize],
	);

	const handleFieldRemove = useCallback(
		(fieldId: string) => {
			handleFieldRemoveRaw(fieldId);
			setSelectedFieldIds((prev) => {
				if (!prev.has(fieldId)) return prev;
				const next = new Set(prev);
				next.delete(fieldId);
				return next;
			});
		},
		[handleFieldRemoveRaw],
	);

	const handleRemoveSelectedFields = useCallback(() => {
		if (selectedFieldIds.size === 0) return;
		handleBulkFieldRemove(selectedFieldIds);
		clearFieldSelection();
	}, [selectedFieldIds, handleBulkFieldRemove, clearFieldSelection]);

	const handleSetActiveAssigneeId = useCallback(
		(id: string) => {
			setActiveAssigneeId(id);
			if (selectedFieldIds.size === 0) return;
			const assignee = resolveActiveAssignee(assignees, id);
			if (!assignee) return;
			handleBulkFieldUpdate(selectedFieldIds, {
				assignedSignerWallet: assignee.walletAddress,
				assignedSignerName: assignee.name,
				assignedSignerEmail: assignee.email,
				required: assignee.required,
			});
		},
		[assignees, selectedFieldIds, handleBulkFieldUpdate],
	);

	const handlePlaceAtCoords = useCallback(
		(coords: { x: number; y: number; page: number }) => {
			if (!pendingFieldType || !currentDocumentId) return;
			if (assignees.length === 0) {
				cancelPlacement();
				return;
			}
			setCurrentPage(coords.page);
			const assignee = resolveActiveAssignee(assignees, activeAssigneeId);
			if (!assignee) return;
			placeField({
				type: pendingFieldType,
				x: coords.x,
				y: coords.y,
				page: coords.page,
			});
		},
		[
			pendingFieldType,
			currentDocumentId,
			assignees,
			activeAssigneeId,
			placeField,
			cancelPlacement,
		],
	);

	const placementFieldTypeLabel = useMemo(() => {
		if (!pendingFieldType) return "Field";
		return (
			signatureFieldPalette.find((c) => c.type === pendingFieldType)?.label ??
			pendingFieldType
		);
	}, [pendingFieldType]);

	const handleFieldSelect = useCallback(
		(fieldId: string, options?: { additive?: boolean }) => {
			cancelPlacement();
			const field = signatureFields.find((f) => f.id === fieldId);
			if (field?.page) {
				setCurrentPage(field.page);
			}
			selectField(fieldId, options?.additive ?? false);
		},
		[cancelPlacement, selectField, signatureFields],
	);

	const handleMarqueeSelect = useCallback(
		(fieldIds: string[], additive: boolean) => {
			cancelPlacement();
			selectFields(fieldIds, additive);
		},
		[cancelPlacement, selectFields],
	);

	const focusFieldOnCanvas = useCallback(
		(fieldId: string) => {
			const field = signatureFields.find((f) => f.id === fieldId);
			if (!field) return;
			if (field.documentId !== currentDocumentId) {
				setCurrentDocumentId(field.documentId);
			}
			if (field.page !== currentPage) {
				setCurrentPage(field.page);
			}
			handleFieldSelect(fieldId);
			setFieldFocusRequestId(fieldId);
		},
		[signatureFields, currentDocumentId, currentPage, handleFieldSelect],
	);

	const clearFieldFocusRequest = useCallback(() => {
		setFieldFocusRequestId(null);
	}, []);

	const handleClearAllFields = useCallback(() => {
		if (signatureFields.length === 0) return;
		commitFields([]);
		clearFieldSelection();
	}, [signatureFields.length, commitFields, clearFieldSelection]);

	const recordPdfPageLayout = useCallback((page: number, height: number) => {
		pageHeightsRef.current.set(page, height);
		const maxHeight = Math.max(...pageHeightsRef.current.values(), height);
		setPdfLayoutHeight(maxHeight);
	}, []);

	const getPageHeight = useCallback(
		(page: number) => pageHeightsRef.current.get(page) ?? placementDocHeight,
		[placementDocHeight],
	);

	const handleCanvasDeselect = useCallback(() => {
		clearFieldSelection();
	}, [clearFieldSelection]);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			const mod = e.metaKey || e.ctrlKey;
			if (mod && e.key === "z" && !e.shiftKey) {
				e.preventDefault();
				undo();
				return;
			}
			if (mod && (e.key === "Z" || (e.key === "z" && e.shiftKey))) {
				e.preventDefault();
				redo();
				return;
			}
			if (mod && e.key === "d" && selectedField) {
				e.preventDefault();
				handleFieldDuplicate(selectedField);
				return;
			}
			if (
				(e.key === "Backspace" || e.key === "Delete") &&
				selectedFieldIds.size > 0 &&
				!(e.target instanceof HTMLInputElement) &&
				!(e.target instanceof HTMLTextAreaElement)
			) {
				e.preventDefault();
				handleRemoveSelectedFields();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [
		undo,
		redo,
		selectedField,
		selectedFieldIds,
		handleFieldDuplicate,
		handleRemoveSelectedFields,
	]);

	const documents: Document[] = useMemo(
		() =>
			(createForm?.documents ?? []).map((doc) => ({
				id: doc.id,
				name: doc.name,
				mimeType: doc.type,
				url: documentUrls[doc.id] ?? "",
				pdfBytes: documentPdfBytes[doc.id],
				pages: doc.pageCount ?? 1,
			})),
		[createForm?.documents, documentUrls, documentPdfBytes],
	);

	useEffect(() => {
		if (!persistHydrated) return;
		if (!draftReady && !suppressEmptyDraftRedirect) {
			void navigate({ to: "/dashboard/templates", replace: true });
		}
	}, [persistHydrated, draftReady, suppressEmptyDraftRedirect, navigate]);

	useEffect(() => {
		if (documents.length > 0 && !currentDocumentId) {
			setCurrentDocumentId(documents[0].id);
		}
	}, [documents, currentDocumentId]);

	useEffect(() => {
		setPdfLayoutHeight(null);
		setPdfNumPages(null);
		pageHeightsRef.current = new Map();
		setDocRendering(true);
	}, [currentDocumentId]);

	useEffect(() => {
		seedPlacementFieldPresetsFromFields(
			fieldSizePresetsRef.current,
			signatureFields,
		);
	}, [signatureFields]);

	const currentDocument: Document | undefined = documents.find(
		(doc) => doc.id === currentDocumentId,
	);

	const currentDocumentFields = useMemo(
		() =>
			sortPlacedFields(
				signatureFields.filter(
					(field) => field.documentId === currentDocumentId,
				),
			),
		[signatureFields, currentDocumentId],
	);

	const handleSend = useCallback(async () => {}, []);
	const handlePostSendDone = useCallback(() => {}, []);
	const dismissSendProgress = useCallback(() => {}, []);
	const documentLoadingMessage =
		templateEditorLoadState === "loading"
			? "Loading template..."
			: templateEditorLoadState === "awaiting_crypto"
				? "Unlock encryption keys to edit this template."
				: null;

	const handleDocumentSelect = useCallback(
		(documentId: string) => {
			setCurrentDocumentId(documentId);
			setCurrentPage(1);
			clearFieldSelection();
		},
		[clearFieldSelection],
	);

	return {
		persistHydrated,
		draftReady,
		documents,
		currentDocument,
		currentDocumentId,
		currentPage,
		currentDocumentFields,
		signatureFields,
		setCurrentPage,
		sendStatus,
		postSendDialogOpen,
		postSendShare,
		postSendWarmSummary,
		sendProgressOpen,
		sendProgressState,
		dismissSendProgress,
		suppressEmptyDraftRedirect,
		selectedField,
		selectedFieldIds,
		isPlacingField,
		pendingFieldType,
		placementFieldTypeLabel,
		activeAssigneeId,
		setActiveAssigneeId: handleSetActiveAssigneeId,
		assignees,
		isInteractingField,
		setIsInteractingField,
		docRendering,
		setDocRendering,
		documentWidth: docWidth,
		documentHeight: placementDocHeight,
		margin,
		pdfNumPages,
		setPdfNumPages,
		recordPdfPageLayout,
		getPageHeight,
		fieldFocusRequestId,
		clearFieldFocusRequest,
		focusFieldOnCanvas,
		handleClearAllFields,
		applyFieldPatches,
		handleAddField,
		placeField,
		handlePlaceAtCoords,
		handleFieldSelect,
		handleMarqueeSelect,
		handleCanvasDeselect,
		handleFieldRemove,
		handleFieldUpdate,
		handleFieldDuplicate,
		handleSend,
		handleDocumentSelect,
		handlePostSendDone,
		documentLoadingMessage,
		undo,
		redo,
		canUndo,
		canRedo,
		setSelectedField,
		resolvePlacementFieldSize: resolveFieldSize,
	};
}

export type TemplateEditorController = AddSignController;
