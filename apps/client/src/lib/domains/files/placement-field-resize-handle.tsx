export function placementFieldResizeHandleSizePx(fieldSizePx: number): number {
	return Math.max(2, Math.min(8, Math.round(fieldSizePx * 0.22)));
}

type PlacementFieldResizeHandleProps = {
	visible: boolean;
	fieldSizePx: number;
	onPointerDown: (event: React.PointerEvent) => void;
};

export function PlacementFieldResizeHandle({
	visible,
	fieldSizePx,
	onPointerDown,
}: PlacementFieldResizeHandleProps) {
	if (!visible) return null;

	const sizePx = placementFieldResizeHandleSizePx(fieldSizePx);

	return (
		<button
			type="button"
			className="absolute bottom-0 right-0 z-[2] cursor-se-resize touch-none rounded-full border border-placement-chrome-border bg-placement-chrome"
			style={{
				width: sizePx,
				height: sizePx,
				transform: "translate(50%, 50%)",
			}}
			aria-label="Resize field"
			onPointerDown={onPointerDown}
		/>
	);
}
