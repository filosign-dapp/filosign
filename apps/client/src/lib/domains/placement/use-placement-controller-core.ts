import { useUserProfile } from "@filosign/react/users";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import {
	type DraftSyncMode,
	pruneSignatureFields,
	type ServerDraftLoadState,
	useDraftDocumentPreview,
} from "@/src/lib/domains/drafts";
import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";
import { normalizeSignatureFieldsList } from "@/src/lib/domains/files/field-box";
import type {
	PlacementControllerCore,
	PlacementDocument,
} from "@/src/lib/domains/placement/types";
import { useDocumentDimensions } from "@/src/lib/domains/placement/use-document-dimensions";
import { usePlacementFields } from "@/src/lib/domains/placement/use-placement-fields";
import { usePlacementHistory } from "@/src/lib/domains/placement/use-placement-history";
import { usePlacementMode } from "@/src/lib/domains/placement/use-placement-mode";
import {
	buildActiveAssignees,
	resolveActiveAssignee,
} from "@/src/lib/domains/placement/utils/active-assignees";
import { signatureFieldPalette } from "@/src/lib/domains/placement/utils/field-types";
import { sortPlacedFields } from "@/src/lib/domains/placement/utils/placed-fields";
import {
	buildPlacementFieldNudgePatches,
	placementKeyboardNudgeDelta,
	SELF_ASSIGNEE_ID,
} from "@/src/lib/domains/placement/utils/placement-coordinates";
import {
	type PlacementFieldPresetStore,
	rememberPlacementFieldSize,
	resolvePlacementFieldSize,
	seedPlacementFieldPresetsFromFields,
} from "@/src/lib/domains/placement/utils/placement-field-presets";
import {
	useStorePersist,
	useStorePersistHydrated,
} from "@/src/lib/filosign/use-store";

export type PlacementControllerCoreArgs = {
	preview: {
		draftSyncMode: DraftSyncMode;
		serverDraftLoadState: ServerDraftLoadState;
	};
	lifecycle: {
		redirectTo: string;
		suppressEmptyDraftRedirect: boolean;
		documentLoadingMessage: string | null;
	};
	interactionMode?: "edit" | "view";
};

export function usePlacementControllerCore(
	args: PlacementControllerCoreArgs,
): PlacementControllerCore {
	const navigate = useNavigate();
	const readOnly = args.interactionMode === "view";
	const { redirectTo, suppressEmptyDraftRedirect, documentLoadingMessage } =
		args.lifecycle;
	const createForm = useStorePersist((s) => s.createForm);
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const persistHydrated = useStorePersistHydrated();
	const draftReady = Boolean(createForm?.documents?.length);
	const { documentUrls, documentPdfBytes } = useDraftDocumentPreview({
		createForm,
		draftSyncMode: args.preview.draftSyncMode,
		serverDraftLoadState: args.preview.serverDraftLoadState,
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
			if (readOnly) return;
			const prev = useStorePersist.getState().createForm;
			if (!prev) return;
			setCreateForm({ ...prev, signatureFields: fields });
		},
		[readOnly, setCreateForm],
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
		handleBulkFieldUpdate,
		handleFieldRemove: handleFieldRemoveRaw,
		handleBulkFieldRemove,
		handleFieldDuplicate,
		applyFieldPatches,
		importSignatureFields,
	} = usePlacementFields(commitFields, signatureFields, resolveFieldSize);

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
		(placeArgs: {
			type: SignatureField["type"];
			x: number;
			y: number;
			page?: number;
		}) => {
			if (readOnly) return null;
			const assignee = resolveActiveAssignee(assignees, activeAssigneeId);
			if (!assignee || !currentDocumentId) return null;
			if (!assignee.placementEnabled) {
				toastUser.error(TOASTS.send.selfSignToggleRequired.title, {
					hint: TOASTS.send.selfSignToggleRequired.hint,
				});
				return null;
			}
			const id = placeFieldRaw({
				type: placeArgs.type,
				x: placeArgs.x,
				y: placeArgs.y,
				documentId: currentDocumentId,
				page: placeArgs.page ?? currentPage,
				assignee,
			});
			if (id && isPlacingField && pendingFieldType === placeArgs.type) {
				finishPlacement();
			}
			return id;
		},
		[
			readOnly,
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
			if (readOnly) return;
			const field = signatureFields.find((f) => f.id === fieldId);
			handleFieldUpdateRaw(fieldId, updates);
			if (!field) return;
			if (updates.width === undefined && updates.height === undefined) return;
			rememberFieldSize(field.type, {
				width: updates.width ?? field.width,
				height: updates.height ?? field.height,
			});
		},
		[readOnly, handleFieldUpdateRaw, signatureFields, rememberFieldSize],
	);

	const handleFieldRemove = useCallback(
		(fieldId: string) => {
			if (readOnly) return;
			handleFieldRemoveRaw(fieldId);
			setSelectedFieldIds((prev) => {
				if (!prev.has(fieldId)) return prev;
				const next = new Set(prev);
				next.delete(fieldId);
				return next;
			});
		},
		[readOnly, handleFieldRemoveRaw, setSelectedFieldIds],
	);

	const handleRemoveSelectedFields = useCallback(() => {
		if (readOnly) return;
		if (selectedFieldIds.size === 0) return;
		handleBulkFieldRemove(selectedFieldIds);
		clearFieldSelection();
	}, [readOnly, selectedFieldIds, handleBulkFieldRemove, clearFieldSelection]);

	const handlePlaceAtCoords = useCallback(
		(coords: { x: number; y: number; page: number }) => {
			if (readOnly) return;
			if (!pendingFieldType || !currentDocumentId) return;
			if (assignees.length === 0) {
				cancelPlacement();
				return;
			}
			setCurrentPage(coords.page);
			placeField({
				type: pendingFieldType,
				x: coords.x,
				y: coords.y,
				page: coords.page,
			});
		},
		[
			readOnly,
			pendingFieldType,
			currentDocumentId,
			assignees,
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

	const handlePaletteTypeClick = useCallback(
		(type: SignatureField["type"]) => {
			if (readOnly) return;
			cancelPlacement();
			if (selectedFieldIds.size === 1) {
				const fieldId = [...selectedFieldIds][0];
				if (fieldId) {
					handleFieldUpdateRaw(fieldId, { type });
				}
				return;
			}
			if (selectedFieldIds.size > 1) {
				handleBulkFieldUpdate(selectedFieldIds, { type });
				return;
			}
			handleAddField(type);
		},
		[
			readOnly,
			cancelPlacement,
			selectedFieldIds,
			handleFieldUpdateRaw,
			handleBulkFieldUpdate,
			handleAddField,
		],
	);

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
		if (readOnly) return;
		if (signatureFields.length === 0) return;
		commitFields([]);
		clearFieldSelection();
	}, [readOnly, signatureFields.length, commitFields, clearFieldSelection]);

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

	const nudgeSelectedFields = useCallback(
		(deltaX: number, deltaY: number) => {
			if (readOnly || selectedFieldIds.size === 0) return;

			const patches = buildPlacementFieldNudgePatches({
				fieldIds: selectedFieldIds,
				fields: signatureFields,
				currentDocumentId,
				deltaX,
				deltaY,
				viewportForPage: (page) => ({
					docWidth,
					margin,
					docHeight: getPageHeight(page),
				}),
			});

			if (patches.size > 0) {
				applyFieldPatches(patches);
			}
		},
		[
			readOnly,
			selectedFieldIds,
			signatureFields,
			currentDocumentId,
			docWidth,
			margin,
			getPageHeight,
			applyFieldPatches,
		],
	);

	const isPlacementKeyboardTarget = (target: EventTarget | null) => {
		if (!(target instanceof HTMLElement)) return true;
		if (target instanceof HTMLInputElement) return false;
		if (target instanceof HTMLTextAreaElement) return false;
		if (target.isContentEditable) return false;
		return true;
	};

	useEffect(() => {
		if (readOnly) return;
		const onKeyDown = (e: KeyboardEvent) => {
			const mod = e.metaKey || e.ctrlKey;
			if (e.key === "Escape" && isPlacementKeyboardTarget(e.target)) {
				e.preventDefault();
				if (isPlacingField) {
					cancelPlacement();
					return;
				}
				if (selectedFieldIds.size > 0) {
					clearFieldSelection();
					return;
				}
			}
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
				isPlacementKeyboardTarget(e.target)
			) {
				e.preventDefault();
				handleRemoveSelectedFields();
				return;
			}
			if (
				!mod &&
				!isPlacingField &&
				selectedFieldIds.size > 0 &&
				isPlacementKeyboardTarget(e.target)
			) {
				const delta = placementKeyboardNudgeDelta(e.key, e.shiftKey);
				if (delta) {
					e.preventDefault();
					nudgeSelectedFields(delta.deltaX, delta.deltaY);
				}
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [
		readOnly,
		undo,
		redo,
		selectedField,
		selectedFieldIds,
		handleFieldDuplicate,
		handleRemoveSelectedFields,
		isPlacingField,
		cancelPlacement,
		clearFieldSelection,
		nudgeSelectedFields,
	]);

	const documents: PlacementDocument[] = useMemo(
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
			void navigate({ to: redirectTo, replace: true });
		}
	}, [
		persistHydrated,
		draftReady,
		suppressEmptyDraftRedirect,
		navigate,
		redirectTo,
	]);

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

	const currentDocument: PlacementDocument | undefined = documents.find(
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

	const handleDocumentSelect = useCallback(
		(documentId: string) => {
			setCurrentDocumentId(documentId);
			setCurrentPage(1);
			clearFieldSelection();
		},
		[clearFieldSelection],
	);

	return {
		interactionMode: readOnly ? "view" : "edit",
		persistHydrated,
		draftReady,
		documents,
		currentDocument,
		currentDocumentId,
		currentPage,
		currentDocumentFields,
		signatureFields,
		setCurrentPage,
		suppressEmptyDraftRedirect,
		selectedField,
		selectedFieldIds,
		isPlacingField,
		pendingFieldType,
		placementFieldTypeLabel,
		activeAssigneeId,
		setActiveAssigneeId,
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
		applyFieldPatches: readOnly ? () => {} : applyFieldPatches,
		handleAddField: readOnly ? () => {} : handleAddField,
		handlePaletteTypeClick: readOnly ? () => {} : handlePaletteTypeClick,
		cancelPlacement: readOnly ? () => {} : cancelPlacement,
		placeField,
		handlePlaceAtCoords,
		handleFieldSelect,
		handleMarqueeSelect,
		handleCanvasDeselect,
		handleFieldRemove,
		handleFieldUpdate,
		handleFieldDuplicate: readOnly ? () => {} : handleFieldDuplicate,
		importSignatureFields: readOnly ? () => {} : importSignatureFields,
		handleDocumentSelect,
		documentLoadingMessage,
		undo,
		redo,
		canUndo,
		canRedo,
		setSelectedField,
		resolvePlacementFieldSize: resolveFieldSize,
	};
}
