import { DragOverlay } from "@dnd-kit/core";
import { signerAccentColor } from "@/src/lib/domains/files/field-box";
import { PlacementChromeScaled } from "@/src/lib/domains/files/placement-chrome-scaled";
import {
	SignatureFieldTypeIcon,
	signatureFieldTypeLabel,
} from "@/src/lib/domains/files/placement-field-display";
import { useAddSignDnd } from "@/src/lib/domains/placement/context";
import type { SignatureField } from "@/src/lib/domains/placement/types";
import {
	parsePaletteDraggableId,
	resolveDragPageScale,
} from "@/src/lib/domains/placement/utils/placement-coordinates";
import type { PlacementFieldSize } from "@/src/lib/domains/placement/utils/placement-field-presets";
import { useIsMobile } from "@/src/lib/utils/use-mobile";
import { usePlacementCanvas } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-placement-canvas";

export type PlacementActiveDrag = {
	kind: "palette";
	fieldType: SignatureField["type"];
};

export function resolvePlacementActiveDrag(
	activeId: string | number,
): PlacementActiveDrag | null {
	const paletteType = parsePaletteDraggableId(activeId);
	if (!paletteType) return null;
	return {
		kind: "palette",
		fieldType: paletteType as SignatureField["type"],
	};
}

type PaletteDragPreviewProps = {
	fieldType: SignatureField["type"];
	screenScale: number;
	isMobile: boolean;
	size: PlacementFieldSize;
};

/** Sidebar palette ghost - matches on-canvas field chrome at current zoom. */
function PaletteDragPreview({
	fieldType,
	screenScale,
	isMobile,
	size,
}: PaletteDragPreviewProps) {
	const safeScale = screenScale > 0 ? screenScale : 1;
	const accent = signerAccentColor("palette-preview@filosign.local");

	return (
		<div
			className="cursor-grabbing"
			style={{
				width: size.width * safeScale,
				height: size.height * safeScale,
			}}
		>
			<div
				className="box-border"
				style={{
					width: size.width,
					height: size.height,
					transform: `scale(${safeScale})`,
					transformOrigin: "top left",
				}}
			>
				<PlacementChromeScaled fieldHeightPx={size.height}>
					<div
						className="placement-field-chrome flex h-full w-full items-center"
						style={{
							borderLeftWidth: 3,
							borderLeftColor: accent,
						}}
					>
						<span className="shrink-0">
							<SignatureFieldTypeIcon type={fieldType} isMobile={isMobile} />
						</span>
						<div className="min-w-0 flex-1 leading-none">
							<div className="truncate placement-field-label">
								{signatureFieldTypeLabel(fieldType)}
							</div>
						</div>
					</div>
				</PlacementChromeScaled>
			</div>
		</div>
	);
}

type PlacementDndDragOverlayProps = {
	activeDrag: PlacementActiveDrag | null;
};

export function PlacementDndDragOverlay({
	activeDrag,
}: PlacementDndDragOverlayProps) {
	const isMobile = useIsMobile();
	const { resolvePlacementFieldSize } = useAddSignDnd();
	const { pageRefs, getPageEl } = usePlacementCanvas();

	const screenScale = activeDrag
		? resolveDragPageScale(pageRefs.current, getPageEl, 1)
		: 1;

	return (
		<DragOverlay adjustScale={false} dropAnimation={null}>
			{activeDrag?.kind === "palette" ? (
				<PaletteDragPreview
					fieldType={activeDrag.fieldType}
					screenScale={screenScale}
					isMobile={isMobile}
					size={resolvePlacementFieldSize(activeDrag.fieldType)}
				/>
			) : null}
		</DragOverlay>
	);
}
