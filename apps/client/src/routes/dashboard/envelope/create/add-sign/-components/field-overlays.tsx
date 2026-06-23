import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { memo, useCallback, useRef } from "react";
import {
	clampFieldHeight,
	clampFieldWidth,
	signerAccentColor,
} from "@/src/lib/domains/files/field-box";
import { PlacementCheckboxField } from "@/src/lib/domains/files/placement-checkbox-field";
import { signatureFieldTypeLabel } from "@/src/lib/domains/files/placement-field-display";
import { PlacementFieldEditorChrome } from "@/src/lib/domains/files/placement-field-editor-chrome";
import type { SignatureField } from "@/src/lib/domains/placement/types";
import {
	dragTransformInPageSpace,
	fieldDraggableId,
	finalizePlacementRectAfterFreeformResize,
	PLACEMENT_FIELD_OVERLAY_CLASS,
	pageScale,
	placementRectFromField,
} from "@/src/lib/domains/placement/utils/placement-coordinates";
import { cn } from "@/src/lib/utils/utils";
import { usePlacementCanvas } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-placement-canvas";

type DraggableFieldOverlayProps = {
	field: SignatureField;
	selectedFieldIds: Set<string>;
	otherFieldsOnPage: SignatureField[];
	documentWidth: number;
	documentHeight: number;
	margin: number;
	isMobile: boolean;
	isPlacingField: boolean;
	onFieldClick: (fieldId: string, event: React.MouseEvent) => void;
	onFieldRemove: (fieldId: string) => void;
	onFieldUpdate: (fieldId: string, updates: Partial<SignatureField>) => void;
	onFieldDuplicate: (fieldId: string) => void;
	onResizeStart: () => void;
	onResizeEnd: () => void;
};

function DraggableFieldOverlay({
	field,
	selectedFieldIds,
	otherFieldsOnPage,
	documentWidth,
	documentHeight,
	margin,
	isMobile,
	isPlacingField,
	onFieldClick,
	onFieldRemove,
	onFieldUpdate,
	onFieldDuplicate,
	onResizeStart,
	onResizeEnd,
}: DraggableFieldOverlayProps) {
	const { getPageEl } = usePlacementCanvas();
	const pageEl = getPageEl(field.page);
	const resizeStartRef = useRef<{
		width: number;
		height: number;
		startX: number;
		startY: number;
	} | null>(null);
	const isSelected = selectedFieldIds.has(field.id);
	const isPrimarySelected = isSelected && selectedFieldIds.size === 1;

	const { attributes, listeners, setNodeRef, transform, isDragging } =
		useDraggable({
			id: fieldDraggableId(field.id),
			disabled: isPlacingField,
		});

	const viewport = {
		docWidth: documentWidth,
		docHeight: documentHeight,
		margin,
	};

	const rect = placementRectFromField(
		{
			x: field.x,
			y: field.y,
			width: field.width,
			height: field.height,
		},
		viewport,
	);

	const accent = signerAccentColor(field.assignedSignerEmail);

	const otherRects = otherFieldsOnPage
		.filter((f) => f.id !== field.id)
		.map((f) =>
			placementRectFromField(
				{ x: f.x, y: f.y, width: f.width, height: f.height },
				viewport,
			),
		);

	const handleResizePointerDown = useCallback(
		(e: React.PointerEvent) => {
			if (isPlacingField) return;
			e.stopPropagation();
			e.preventDefault();
			onResizeStart();
			resizeStartRef.current = {
				width: field.width,
				height: field.height,
				startX: e.clientX,
				startY: e.clientY,
			};

			const onMove = (ev: PointerEvent) => {
				const start = resizeStartRef.current;
				if (!start) return;
				const pageEl = getPageEl(field.page);
				const scale =
					pageEl && pageEl.offsetWidth > 0
						? pageEl.getBoundingClientRect().width / pageEl.offsetWidth
						: 1;
				const deltaX = (ev.clientX - start.startX) / scale;
				const initial = placementRectFromField(
					{
						x: field.x,
						y: field.y,
						width: field.width,
						height: field.height,
					},
					viewport,
				);
				const newWidth = clampFieldWidth(
					field.type,
					start.width + deltaX,
					isMobile,
				);
				const deltaY = (ev.clientY - start.startY) / scale;
				const next = finalizePlacementRectAfterFreeformResize({
					initial,
					newWidth,
					newHeight: clampFieldHeight(
						field.type,
						start.height + deltaY,
						isMobile,
					),
					viewport,
					otherFieldsOnPage: otherRects,
				});
				onFieldUpdate(field.id, {
					x: next.x,
					y: next.y,
					width: next.width,
					height: next.height,
				});
			};

			const onUp = () => {
				resizeStartRef.current = null;
				onResizeEnd();
				window.removeEventListener("pointermove", onMove);
				window.removeEventListener("pointerup", onUp);
			};

			window.addEventListener("pointermove", onMove);
			window.addEventListener("pointerup", onUp);
		},
		[
			field,
			isMobile,
			isPlacingField,
			onFieldUpdate,
			onResizeEnd,
			onResizeStart,
			getPageEl,
			viewport,
			otherRects,
		],
	);

	const dragStyle = transform
		? {
				transform: CSS.Translate.toString(
					dragTransformInPageSpace(transform, pageScale(pageEl)),
				),
			}
		: undefined;

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: field placement overlay click is handled on canvas container
		// biome-ignore lint/a11y/useKeyWithClickEvents: canvas keyboard support is out of scope for field placement
		<div
			ref={setNodeRef}
			data-field-id={field.id}
			className={cn(
				PLACEMENT_FIELD_OVERLAY_CLASS,
				"absolute box-border select-none group z-30 touch-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0",
				isPlacingField ? "pointer-events-none cursor-default" : "cursor-move",
				isDragging && "z-40 opacity-90 shadow-lg",
			)}
			style={{
				left: rect.x,
				top: rect.y,
				width: rect.width,
				height: rect.height,
				...dragStyle,
			}}
			onClick={(e) => onFieldClick(field.id, e)}
			{...(!isPlacingField ? listeners : undefined)}
			{...(!isPlacingField ? { ...attributes, tabIndex: -1 } : undefined)}
		>
			{field.type === "checkbox" ? (
				<div className="relative h-full w-full">
					{isSelected ? (
						<div
							className="placement-field-editor-selected-overlay"
							aria-hidden
						/>
					) : null}
					<PlacementCheckboxField
						checked={false}
						accentColor={accent}
						fieldHeightPx={rect.height}
						className={cn(
							"outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0",
							isSelected && "placement-field-editor-selected",
						)}
						showResizeHandle={isPrimarySelected && !isPlacingField}
						onResizePointerDown={handleResizePointerDown}
					/>
				</div>
			) : (
				<PlacementFieldEditorChrome
					field={field}
					fieldHeightPx={rect.height}
					accentColor={accent}
					isMobile={isMobile}
					isPlacingField={isPlacingField}
					isSelected={isSelected}
					isPrimarySelected={isPrimarySelected}
					onDuplicate={() => onFieldDuplicate(field.id)}
					onRemove={() => onFieldRemove(field.id)}
					onToggleRequired={() =>
						onFieldUpdate(field.id, { required: !field.required })
					}
					onResizePointerDown={handleResizePointerDown}
				/>
			)}
		</div>
	);
}

type SignatureFieldOverlaysProps = {
	signatureFields: SignatureField[];
	selectedFieldIds: Set<string>;
	documentWidth: number;
	documentHeight: number;
	margin: number;
	isMobile: boolean;
	isPlacingField: boolean;
	onFieldClick: (fieldId: string, event: React.MouseEvent) => void;
	onFieldRemove: (fieldId: string) => void;
	onFieldUpdate: (fieldId: string, updates: Partial<SignatureField>) => void;
	onFieldDuplicate: (fieldId: string) => void;
	onResizeStart: () => void;
	onResizeEnd: () => void;
};

export const SignatureFieldOverlays = memo(function SignatureFieldOverlays({
	signatureFields,
	selectedFieldIds,
	documentWidth,
	documentHeight,
	margin,
	isMobile,
	isPlacingField,
	onFieldClick,
	onFieldRemove,
	onFieldUpdate,
	onFieldDuplicate,
	onResizeStart,
	onResizeEnd,
}: SignatureFieldOverlaysProps) {
	return (
		<>
			{signatureFields.map((field) => (
				<DraggableFieldOverlay
					key={field.id}
					field={field}
					selectedFieldIds={selectedFieldIds}
					otherFieldsOnPage={signatureFields}
					documentWidth={documentWidth}
					documentHeight={documentHeight}
					margin={margin}
					isMobile={isMobile}
					isPlacingField={isPlacingField}
					onFieldClick={onFieldClick}
					onFieldRemove={onFieldRemove}
					onFieldUpdate={onFieldUpdate}
					onFieldDuplicate={onFieldDuplicate}
					onResizeStart={onResizeStart}
					onResizeEnd={onResizeEnd}
				/>
			))}
		</>
	);
});

export { signatureFieldTypeLabel };
