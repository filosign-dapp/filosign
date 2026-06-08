import type { ReactNode } from "react";
import { PanZoomCanvas } from "@/src/lib/domains/files/document-viewport";
import { cn } from "@/src/lib/utils/utils";

type PlacementCanvasProps = {
	children: ReactNode;
	isPlacingField: boolean;
	isInteractingField: boolean;
	isMarqueeModifierHeld: boolean;
	placementCapture?: ReactNode;
	className?: string;
};

export function PlacementCanvas({
	children,
	isPlacingField,
	isInteractingField,
	isMarqueeModifierHeld,
	placementCapture,
	className,
}: PlacementCanvasProps) {
	return (
		<PanZoomCanvas
			disablePan={isPlacingField || isInteractingField || isMarqueeModifierHeld}
			placementCapture={isPlacingField ? placementCapture : undefined}
			crosshairCursor={isPlacingField}
			className={cn("min-h-0 flex-1", className)}
		>
			{children}
		</PanZoomCanvas>
	);
}
