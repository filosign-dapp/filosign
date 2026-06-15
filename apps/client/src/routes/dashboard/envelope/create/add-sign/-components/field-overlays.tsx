import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
	AsteriskIcon,
	CircleIcon,
	CopyIcon,
	DotsSixVerticalIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { memo, useCallback, useRef } from "react";
import {
	clampFieldHeight,
	clampFieldWidth,
	defaultPlacementFieldRect,
	fieldSupportsFreeformResize,
	signerAccentColor,
} from "@/src/lib/domains/files/field-box";
import { PlacementCheckboxField } from "@/src/lib/domains/files/placement-checkbox-field";
import {
	SignatureFieldTypeIcon,
	signatureFieldTypeLabel,
	signerDisplayName,
} from "@/src/lib/domains/files/placement-field-display";
import type { SignatureField } from "@/src/lib/domains/placement/types";
import {
	dragTransformInPageSpace,
	fieldDraggableId,
	finalizePlacementRectAfterFreeformResize,
	finalizePlacementRectAfterResize,
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
	const defaults = defaultPlacementFieldRect(field.type, isMobile);
	const freeformResize = fieldSupportsFreeformResize(field.type);

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
				const next = freeformResize
					? finalizePlacementRectAfterFreeformResize({
							initial,
							newWidth,
							newHeight: clampFieldHeight(
								field.type,
								start.height + deltaY,
								isMobile,
							),
							viewport,
							otherFieldsOnPage: otherRects,
						})
					: finalizePlacementRectAfterResize({
							initial,
							newWidth,
							aspectRatio: defaults.aspectRatio,
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
			defaults.aspectRatio,
			freeformResize,
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
				"absolute box-border select-none group z-30 touch-none",
				isPlacingField ? "pointer-events-none cursor-default" : "cursor-move",
				isDragging && "z-40 opacity-90 shadow-lg",
			)}
			style={{
				left: rect.x,
				top: rect.y,
				width: rect.width,
				height: rect.height,
				...(field.type !== "checkbox"
					? { borderLeftWidth: 3, borderLeftColor: accent }
					: null),
				...dragStyle,
			}}
			onClick={(e) => onFieldClick(field.id, e)}
			{...(!isPlacingField ? listeners : undefined)}
			{...(!isPlacingField ? attributes : undefined)}
		>
			{field.type === "checkbox" ? (
				<PlacementCheckboxField
					checked={false}
					accentColor={accent}
					className={cn(isSelected && "ring-2 ring-ring/60")}
				/>
			) : (
				<div
					className={cn(
						"placement-field-chrome h-full w-full",
						isSelected && "ring-2 ring-ring/60",
					)}
				>
					{!isPlacingField ? (
						<DotsSixVerticalIcon
							className="size-3 shrink-0 opacity-60"
							weight="bold"
						/>
					) : null}
					<span className="shrink-0 text-placement-chrome-foreground">
						<SignatureFieldTypeIcon type={field.type} isMobile={isMobile} />
					</span>
					<div className="min-w-0 flex-1 leading-none">
						<div className="truncate placement-field-label">
							{signerDisplayName(field)}
						</div>
					</div>
					{field.required ? (
						<AsteriskIcon
							className="size-3 shrink-0 text-amber-400"
							weight="bold"
						/>
					) : (
						<CircleIcon
							className="size-3 shrink-0 opacity-50"
							weight="regular"
						/>
					)}
					{isPrimarySelected ? (
						<div className="flex shrink-0 items-center gap-0.5">
							<button
								type="button"
								className="rounded p-0.5 hover:bg-placement-chrome-foreground/15"
								onClick={(e) => {
									e.stopPropagation();
									onFieldDuplicate(field.id);
								}}
								aria-label="Duplicate field"
							>
								<CopyIcon className="size-3" />
							</button>
							<button
								type="button"
								className="rounded p-0.5 hover:bg-placement-chrome-foreground/15"
								onClick={(e) => {
									e.stopPropagation();
									onFieldRemove(field.id);
								}}
								aria-label="Remove field"
							>
								<TrashIcon className="size-3" />
							</button>
						</div>
					) : null}
				</div>
			)}
			{isPrimarySelected && !isPlacingField ? (
				<button
					type="button"
					className="absolute -bottom-1 -right-1 size-3 cursor-se-resize rounded-sm border border-placement-chrome-border bg-placement-chrome touch-none"
					aria-label="Resize field"
					onPointerDown={handleResizePointerDown}
				/>
			) : null}
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
