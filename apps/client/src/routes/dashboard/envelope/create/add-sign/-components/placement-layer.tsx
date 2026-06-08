import type {
	ClickCoordinates,
	SignatureField,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";

type PlacementCaptureLayerProps = {
	isPlacingField: boolean;
	pendingFieldType: SignatureField["type"] | null;
	onDocumentClick: (event: ClickCoordinates) => void;
};

export function PlacementCaptureLayer({
	isPlacingField,
	pendingFieldType,
	onDocumentClick,
}: PlacementCaptureLayerProps) {
	if (!isPlacingField) {
		return (
			<div className="pointer-events-auto absolute inset-0 h-full w-full cursor-default bg-transparent" />
		);
	}

	return (
		<>
			<div
				className="pointer-events-auto absolute inset-0 z-20 h-full w-full cursor-crosshair bg-blue-500/5"
				onClick={onDocumentClick}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						const rect = e.currentTarget.getBoundingClientRect();
						const mockMouseEvent = {
							clientX: rect.left + rect.width / 2,
							clientY: rect.top + rect.height / 2,
						};
						onDocumentClick(mockMouseEvent);
					}
				}}
				role="button"
				tabIndex={0}
				aria-label={`Click to place ${pendingFieldType} field`}
			/>
			<div className="pointer-events-none absolute inset-0 z-20 border-2 border-dashed border-secondary/50 bg-secondary/20">
				<div className="absolute left-2 top-2 max-w-min(100%,72) rounded bg-secondary px-2 py-1 text-xs text-primary">
					Click the page to place {pendingFieldType}
				</div>
			</div>
		</>
	);
}
