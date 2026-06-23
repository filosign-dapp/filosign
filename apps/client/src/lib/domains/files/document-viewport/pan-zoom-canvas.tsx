import {
	ArrowsInIcon,
	MagnifyingGlassMinusIcon,
	MagnifyingGlassPlusIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
	type ReactZoomPanPinchRef,
	TransformComponent,
	TransformWrapper,
	useControls,
} from "react-zoom-pan-pinch";
import { Button } from "@/src/lib/components/ui/button";
import { cn } from "@/src/lib/utils/utils";
import { useDocumentViewportCanvas } from "./use-viewport-canvas";
import { PLACEMENT_FIELD_OVERLAY_CLASS } from "./viewport-coordinates";

const PAN_EXCLUDED_SELECTORS = [PLACEMENT_FIELD_OVERLAY_CLASS] as const;

function PanZoomControls() {
	const { zoomIn, zoomOut, resetTransform, centerView } = useControls();

	return (
		<div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-1 rounded-md border border-border bg-background/95 p-1 shadow-sm">
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="size-8 p-0"
				onClick={() => zoomOut(0.25)}
				title="Zoom out"
			>
				<MagnifyingGlassMinusIcon className="size-4" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="size-8 p-0"
				onClick={() => zoomIn(0.25)}
				title="Zoom in"
			>
				<MagnifyingGlassPlusIcon className="size-4" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="size-8 p-0"
				onClick={() => resetTransform()}
				title="Reset zoom"
			>
				<ArrowsInIcon className="size-4" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="size-8 p-0"
				onClick={() => centerView()}
				title="Center view"
			>
				<ArrowsInIcon className="size-4 rotate-45" />
			</Button>
		</div>
	);
}

type PanZoomCanvasProps = {
	children: ReactNode;
	disablePan?: boolean;
	placementCapture?: ReactNode;
	showZoomControls?: boolean;
	crosshairCursor?: boolean;
	className?: string;
};

export function PanZoomCanvas({
	children,
	disablePan = false,
	placementCapture,
	showZoomControls = true,
	crosshairCursor = false,
	className,
}: PanZoomCanvasProps) {
	const { panPinchRef, setWrapperEl, setPanZoomTransform } =
		useDocumentViewportCanvas();
	const viewportRef = useRef<HTMLDivElement | null>(null);
	const [isPanning, setIsPanning] = useState(false);

	useEffect(() => {
		setWrapperEl(viewportRef.current);
	}, [setWrapperEl]);

	useEffect(() => {
		if (disablePan) setIsPanning(false);
	}, [disablePan]);

	const showPanCursor = !disablePan && !crosshairCursor && !placementCapture;
	const panCursorClass = showPanCursor
		? isPanning
			? "!cursor-grabbing"
			: "!cursor-grab"
		: crosshairCursor
			? "!cursor-crosshair"
			: undefined;

	const setRef = (instance: ReactZoomPanPinchRef | null) => {
		panPinchRef.current = instance;
	};

	return (
		<div
			ref={viewportRef}
			className={cn("relative flex min-h-0 flex-1 flex-col", className)}
		>
			<TransformWrapper
				ref={setRef}
				initialScale={1}
				minScale={0.5}
				maxScale={6}
				centerOnInit
				limitToBounds={false}
				wheel={{ step: 0.002 }}
				panning={{
					disabled: disablePan,
					excluded: [...PAN_EXCLUDED_SELECTORS],
				}}
				doubleClick={{ disabled: true }}
				onInit={(ref) => {
					setPanZoomTransform({
						positionX: ref.state.positionX,
						scale: ref.state.scale,
					});
				}}
				onTransform={(_ref, state) => {
					setPanZoomTransform({
						positionX: state.positionX,
						scale: state.scale,
					});
				}}
				onPanningStart={() => setIsPanning(true)}
				onPanningStop={() => setIsPanning(false)}
			>
				{showZoomControls ? <PanZoomControls /> : null}
				<TransformComponent
					wrapperClass={cn(
						"!flex-1 !h-full !w-full !overflow-hidden !bg-muted/10",
						panCursorClass,
					)}
					contentClass={cn(
						"!relative !flex !min-h-full !min-w-full !items-start !justify-center !p-8",
						panCursorClass,
					)}
				>
					{placementCapture ? (
						<div className="pointer-events-auto absolute inset-0 z-40 cursor-crosshair">
							{placementCapture}
						</div>
					) : null}
					{children}
				</TransformComponent>
			</TransformWrapper>
		</div>
	);
}
