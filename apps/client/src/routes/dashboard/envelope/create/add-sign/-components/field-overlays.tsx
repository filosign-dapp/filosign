import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
	AsteriskIcon,
	CircleIcon,
	CopyIcon,
	DotsSixVerticalIcon,
	StackIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { memo, useCallback, useRef } from "react";
import {
	clampFieldWidth,
	defaultPlacementFieldRect,
	signerAccentColor,
} from "@/src/lib/domains/files/field-box";
import {
	SignatureFieldTypeIcon,
	signatureFieldTypeLabel,
} from "@/src/lib/domains/files/placement-field-display";
import { cn } from "@/src/lib/utils/utils";
import { usePlacementCanvas } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-placement-canvas";
import type { SignatureField } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";
import {
	dragTransformInPageSpace,
	fieldDraggableId,
	finalizePlacementRectAfterResize,
	PLACEMENT_FIELD_OVERLAY_CLASS,
	pageScale,
	placementRectFromField,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/placement-coordinates";

type DraggableFieldOverlayProps = {
	field: SignatureField;
	selectedFieldIds: Set<string>;
	otherFieldsOnPage: SignatureField[];
	documentWidth: number;
	documentHeight: number;
	margin: number;
	isMobile: boolean;
	isPlacingField: boolean;
	pdfNumPages: number | null;
	onFieldClick: (fieldId: string, event: React.MouseEvent) => void;
	onFieldRemove: (fieldId: string) => void;
	onFieldUpdate: (fieldId: string, updates: Partial<SignatureField>) => void;
	onFieldDuplicate: (fieldId: string) => void;
	onRepeatOnAllPages: (fieldId: string) => void;
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
	pdfNumPages,
	onFieldClick,
	onFieldRemove,
	onFieldUpdate,
	onFieldDuplicate,
	onRepeatOnAllPages,
	onResizeStart,
	onResizeEnd,
}: DraggableFieldOverlayProps) {
	const { pageRef } = usePlacementCanvas();
	const resizeStartRef = useRef<{ width: number; startX: number } | null>(null);
	const isSelected = selectedFieldIds.has(field.id);
	const isPrimarySelected =
		isSelected && selectedFieldIds.size === 1 && selectedFieldIds.has(field.id);

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
			resizeStartRef.current = { width: field.width, startX: e.clientX };

			const onMove = (ev: PointerEvent) => {
				const start = resizeStartRef.current;
				if (!start) return;
				const pageEl = pageRef.current;
				const scale =
					pageEl && pageEl.offsetWidth > 0
						? pageEl.getBoundingClientRect().width / pageEl.offsetWidth
						: 1;
				const deltaX = (ev.clientX - start.startX) / scale;
				const newWidth = clampFieldWidth(
					field.type,
					start.width + deltaX,
					isMobile,
				);
				const next = finalizePlacementRectAfterResize({
					initial: placementRectFromField(
						{
							x: field.x,
							y: field.y,
							width: field.width,
							height: field.height,
						},
						viewport,
					),
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
			isMobile,
			isPlacingField,
			onFieldUpdate,
			onResizeEnd,
			onResizeStart,
			pageRef,
			viewport,
			defaults.aspectRatio,
			otherRects,
		],
	);

	const dragStyle = transform
		? {
				transform: CSS.Translate.toString(
					dragTransformInPageSpace(transform, pageScale(pageRef.current)),
				),
			}
		: undefined;

	const showRepeat =
		isPrimarySelected && pdfNumPages != null && pdfNumPages > 1;

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: field placement overlay click is handled on canvas container
		// biome-ignore lint/a11y/useKeyWithClickEvents: canvas keyboard support is out of scope for field placement
		<div
			ref={setNodeRef}
			className={cn(
				PLACEMENT_FIELD_OVERLAY_CLASS,
				"absolute box-border select-none group z-30 touch-none",
				isPlacingField ? "cursor-default" : "cursor-move",
				isDragging && "opacity-40",
			)}
			style={{
				left: rect.x,
				top: rect.y,
				width: rect.width,
				height: rect.height,
				borderLeftWidth: 3,
				borderLeftColor: accent,
				...dragStyle,
			}}
			onClick={(e) => onFieldClick(field.id, e)}
			{...(!isPlacingField ? listeners : undefined)}
			{...(!isPlacingField ? attributes : undefined)}
		>
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
						{field.assignedSignerEmail}
					</div>
					<div className="truncate placement-field-subtle">
						{field.type === "signature" || field.type === "initial"
							? `placeholder preview · ${signatureFieldTypeLabel(field.type)}`
							: signatureFieldTypeLabel(field.type)}
					</div>
				</div>
				{field.required ? (
					<AsteriskIcon
						className="size-3 shrink-0 text-amber-400"
						weight="bold"
					/>
				) : (
					<CircleIcon className="size-3 shrink-0 opacity-50" weight="regular" />
				)}
				{isPrimarySelected ? (
					<div className="flex shrink-0 items-center gap-0.5">
						{showRepeat ? (
							<button
								type="button"
								className="rounded p-0.5 hover:bg-placement-chrome-foreground/15"
								onClick={(e) => {
									e.stopPropagation();
									onRepeatOnAllPages(field.id);
								}}
								aria-label="Repeat on all pages"
								title="Repeat on all pages"
							>
								<StackIcon className="size-3" />
							</button>
						) : null}
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
	pdfNumPages: number | null;
	onFieldClick: (fieldId: string, event: React.MouseEvent) => void;
	onFieldRemove: (fieldId: string) => void;
	onFieldUpdate: (fieldId: string, updates: Partial<SignatureField>) => void;
	onFieldDuplicate: (fieldId: string) => void;
	onRepeatOnAllPages: (fieldId: string) => void;
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
	pdfNumPages,
	onFieldClick,
	onFieldRemove,
	onFieldUpdate,
	onFieldDuplicate,
	onRepeatOnAllPages,
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
					pdfNumPages={pdfNumPages}
					onFieldClick={onFieldClick}
					onFieldRemove={onFieldRemove}
					onFieldUpdate={onFieldUpdate}
					onFieldDuplicate={onFieldDuplicate}
					onRepeatOnAllPages={onRepeatOnAllPages}
					onResizeStart={onResizeStart}
					onResizeEnd={onResizeEnd}
				/>
			))}
		</>
	);
});

export { signatureFieldTypeLabel };
