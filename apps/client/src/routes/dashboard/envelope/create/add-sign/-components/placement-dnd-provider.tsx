import {
	DndContext,
	type DragCancelEvent,
	type DragEndEvent,
	type DragStartEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import type { ReactNode } from "react";
import { useCallback, useMemo, useRef } from "react";
import { defaultPlacementFieldRect } from "@/src/lib/domains/files/field-box";
import { useIsMobile } from "@/src/lib/utils/use-mobile";
import { useAddSignDnd } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/context";
import type { SignatureField } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";
import {
	clampFieldAtPoint,
	clientPointToPageCoords,
	createRestrictToPageModifier,
	dragEndClientPoint,
	type FieldDragContext,
	finalizePlacementRectAfterMove,
	isClientPointInsidePage,
	parseFieldDraggableId,
	parsePaletteDraggableId,
	placementRectFromField,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/placement-coordinates";
import { usePlacementCanvas } from "./placement-canvas-context";

export {
	fieldDraggableId,
	PLACEMENT_CANVAS_DROPPABLE_ID,
	paletteDraggableId,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/placement-coordinates";

type PlacementDndProviderProps = {
	children: ReactNode;
};

export function PlacementDndProvider({ children }: PlacementDndProviderProps) {
	const isMobile = useIsMobile();
	const { pageRef } = usePlacementCanvas();
	const {
		signatureFields,
		documentWidth,
		documentHeight,
		margin,
		currentDocumentId,
		currentPage,
		selectedFieldIds,
		placeField,
		applyFieldPatches,
		setSelectedField,
		setIsInteractingField,
	} = useAddSignDnd();

	const dragContextRef = useRef<FieldDragContext | null>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
	);

	const viewport = useMemo(
		() => ({
			docWidth: documentWidth,
			docHeight: documentHeight,
			margin,
		}),
		[documentWidth, documentHeight, margin],
	);

	const restrictToPageModifier = useMemo(
		() => createRestrictToPageModifier(() => dragContextRef.current),
		[],
	);

	const fieldsOnCurrentPage = useMemo(
		() =>
			signatureFields.filter(
				(f) => f.documentId === currentDocumentId && f.page === currentPage,
			),
		[signatureFields, currentDocumentId, currentPage],
	);

	const dropFieldAtClientPoint = useCallback(
		(type: SignatureField["type"], clientX: number, clientY: number) => {
			if (!isClientPointInsidePage(clientX, clientY, pageRef.current)) {
				return;
			}
			const defaults = defaultPlacementFieldRect(type, isMobile);
			const raw = clientPointToPageCoords(
				clientX,
				clientY,
				pageRef.current,
				defaults,
			);
			if (!raw) return;
			const { x, y } = clampFieldAtPoint(raw.x, raw.y, defaults, viewport);
			const id = placeField({ type, x, y });
			if (id) setSelectedField(id);
		},
		[isMobile, pageRef, placeField, setSelectedField, viewport],
	);

	const onDragStart = useCallback(
		(event: DragStartEvent) => {
			setIsInteractingField(true);

			const fieldId = parseFieldDraggableId(String(event.active.id));
			if (!fieldId) return;
			const existing = signatureFields.find((f) => f.id === fieldId);
			if (!existing) return;
			dragContextRef.current = {
				initialRect: placementRectFromField(
					{
						x: existing.x,
						y: existing.y,
						width: existing.width,
						height: existing.height,
					},
					viewport,
				),
				viewport,
				pageEl: pageRef.current,
			};
		},
		[signatureFields, pageRef, viewport, setIsInteractingField],
	);

	const finishDrag = useCallback(() => {
		dragContextRef.current = null;
		setIsInteractingField(false);
	}, [setIsInteractingField]);

	const onDragEnd = useCallback(
		(event: DragEndEvent) => {
			finishDrag();
			const { active, delta } = event;
			const activeId = String(active.id);

			const paletteType = parsePaletteDraggableId(activeId);
			if (paletteType) {
				const point = dragEndClientPoint(event);
				if (!point) return;
				dropFieldAtClientPoint(
					paletteType as SignatureField["type"],
					point.clientX,
					point.clientY,
				);
				return;
			}

			const fieldId = parseFieldDraggableId(activeId);
			if (!fieldId || !delta) return;

			const dragged = signatureFields.find((f) => f.id === fieldId);
			if (!dragged) return;

			const moveIds =
				selectedFieldIds.has(fieldId) && selectedFieldIds.size > 1
					? selectedFieldIds
					: new Set([fieldId]);

			const patches = new Map<string, Partial<SignatureField>>();
			for (const id of moveIds) {
				const existing = signatureFields.find((f) => f.id === id);
				if (!existing) continue;
				if (
					existing.documentId !== currentDocumentId ||
					existing.page !== currentPage
				) {
					continue;
				}

				const initial = placementRectFromField(
					{
						x: existing.x,
						y: existing.y,
						width: existing.width,
						height: existing.height,
					},
					viewport,
				);
				const othersOnPage = fieldsOnCurrentPage
					.filter((f) => !moveIds.has(f.id))
					.map((f) =>
						placementRectFromField(
							{
								x: f.x,
								y: f.y,
								width: f.width,
								height: f.height,
							},
							viewport,
						),
					);

				const next = finalizePlacementRectAfterMove({
					initial,
					deltaX: delta.x,
					deltaY: delta.y,
					pageEl: pageRef.current,
					viewport,
					otherFieldsOnPage: othersOnPage,
				});
				patches.set(id, {
					x: next.x,
					y: next.y,
					width: next.width,
					height: next.height,
				});
			}

			if (patches.size > 0) {
				applyFieldPatches(patches);
			}
		},
		[
			signatureFields,
			selectedFieldIds,
			fieldsOnCurrentPage,
			currentDocumentId,
			currentPage,
			dropFieldAtClientPoint,
			applyFieldPatches,
			pageRef,
			viewport,
			finishDrag,
		],
	);

	const onDragCancel = useCallback(
		(_event: DragCancelEvent) => {
			finishDrag();
		},
		[finishDrag],
	);

	return (
		<DndContext
			sensors={sensors}
			modifiers={[restrictToPageModifier]}
			onDragStart={onDragStart}
			onDragEnd={onDragEnd}
			onDragCancel={onDragCancel}
		>
			{children}
		</DndContext>
	);
}
