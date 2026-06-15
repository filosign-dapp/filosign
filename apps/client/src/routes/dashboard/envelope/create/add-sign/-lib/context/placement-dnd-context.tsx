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
import { useCallback, useMemo, useRef, useState } from "react";
import { useAddSignDnd } from "@/src/lib/domains/placement/context";
import type { SignatureField } from "@/src/lib/domains/placement/types";
import {
	clampFieldAtPoint,
	clientPointToPageCoords,
	createRestrictToPageModifier,
	dragEndClientPoint,
	type FieldDragContext,
	finalizePlacementRectAfterMove,
	findPageAtClientPoint,
	parseFieldDraggableId,
	parsePaletteDraggableId,
	placementRectFromField,
} from "@/src/lib/domains/placement/utils/placement-coordinates";
import {
	type PlacementActiveDrag,
	PlacementDndDragOverlay,
	resolvePlacementActiveDrag,
} from "@/src/routes/dashboard/envelope/create/add-sign/-components/placement-dnd-overlay";
import { usePlacementCanvas } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-placement-canvas";

export {
	fieldDraggableId,
	paletteDraggableId,
} from "@/src/lib/domains/placement/utils/placement-coordinates";

type PlacementDndProviderProps = {
	children: ReactNode;
};

export function PlacementDndProvider({ children }: PlacementDndProviderProps) {
	const { pageRefs, getPageEl } = usePlacementCanvas();
	const {
		signatureFields,
		documentWidth,
		margin,
		currentDocumentId,
		getPageHeight,
		selectedFieldIds,
		placeField,
		applyFieldPatches,
		setIsInteractingField,
		resolvePlacementFieldSize,
		interactionMode,
	} = useAddSignDnd();

	const readOnly = interactionMode === "view";

	const dragContextRef = useRef<FieldDragContext | null>(null);
	const [activeDrag, setActiveDrag] = useState<PlacementActiveDrag | null>(
		null,
	);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 4 },
		}),
	);
	const activeSensors = readOnly ? [] : sensors;

	const baseViewport = useMemo(
		() => ({
			docWidth: documentWidth,
			margin,
		}),
		[documentWidth, margin],
	);

	const viewportForPage = useCallback(
		(page: number) => ({
			...baseViewport,
			docHeight: getPageHeight(page),
		}),
		[baseViewport, getPageHeight],
	);

	const restrictToPageModifier = useMemo(
		() => createRestrictToPageModifier(() => dragContextRef.current),
		[],
	);

	const dropFieldAtClientPoint = useCallback(
		(type: SignatureField["type"], clientX: number, clientY: number) => {
			const hit = findPageAtClientPoint(pageRefs.current, clientX, clientY);
			if (!hit) return;

			const size = resolvePlacementFieldSize(type);
			const raw = clientPointToPageCoords(clientX, clientY, hit.el, size);
			if (!raw) return;
			const pageViewport = viewportForPage(hit.page);
			const { x, y } = clampFieldAtPoint(raw.x, raw.y, size, pageViewport);
			placeField({ type, x, y, page: hit.page });
		},
		[pageRefs, placeField, viewportForPage, resolvePlacementFieldSize],
	);

	const onDragStart = useCallback(
		(event: DragStartEvent) => {
			setIsInteractingField(true);
			setActiveDrag(resolvePlacementActiveDrag(event.active.id));

			const fieldId = parseFieldDraggableId(String(event.active.id));
			if (!fieldId) return;
			const existing = signatureFields.find((f) => f.id === fieldId);
			if (!existing) return;
			const pageViewport = viewportForPage(existing.page);
			dragContextRef.current = {
				initialRect: placementRectFromField(
					{
						x: existing.x,
						y: existing.y,
						width: existing.width,
						height: existing.height,
					},
					pageViewport,
				),
				viewport: pageViewport,
				pageEl: getPageEl(existing.page),
			};
		},
		[signatureFields, getPageEl, viewportForPage, setIsInteractingField],
	);

	const finishDrag = useCallback(() => {
		dragContextRef.current = null;
		setActiveDrag(null);
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
				if (existing.documentId !== currentDocumentId) continue;

				const pageEl = getPageEl(existing.page);
				const pageViewport = viewportForPage(existing.page);
				const initial = placementRectFromField(
					{
						x: existing.x,
						y: existing.y,
						width: existing.width,
						height: existing.height,
					},
					pageViewport,
				);
				const othersOnPage = signatureFields
					.filter(
						(f) =>
							f.documentId === currentDocumentId &&
							f.page === existing.page &&
							!moveIds.has(f.id),
					)
					.map((f) =>
						placementRectFromField(
							{
								x: f.x,
								y: f.y,
								width: f.width,
								height: f.height,
							},
							pageViewport,
						),
					);

				const next = finalizePlacementRectAfterMove({
					initial,
					deltaX: delta.x,
					deltaY: delta.y,
					pageEl,
					viewport: pageViewport,
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
			currentDocumentId,
			dropFieldAtClientPoint,
			applyFieldPatches,
			getPageEl,
			viewportForPage,
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
			sensors={activeSensors}
			modifiers={readOnly ? [] : [restrictToPageModifier]}
			onDragStart={onDragStart}
			onDragEnd={onDragEnd}
			onDragCancel={onDragCancel}
		>
			{children}
			<PlacementDndDragOverlay activeDrag={activeDrag} />
		</DndContext>
	);
}
