import type {
	ClickCoordinates,
	SignatureField,
} from "@/src/lib/domains/placement/types";
import type { ClientRect } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/marquee-selection";

type PlacementViewportCaptureProps = {
	pendingFieldType: SignatureField["type"] | null;
	onDocumentClick: (event: ClickCoordinates) => void;
};

/** Invisible full-canvas hit target for click-to-place (visuals are per-page). */
export function PlacementViewportCapture({
	pendingFieldType,
	onDocumentClick,
}: PlacementViewportCaptureProps) {
	const placeAtPointer = (clientX: number, clientY: number) => {
		onDocumentClick({ clientX, clientY });
	};

	return (
		<div
			className="absolute inset-0 cursor-crosshair touch-none bg-transparent"
			onPointerUp={(event) => {
				if (event.button !== 0) return;
				event.stopPropagation();
				placeAtPointer(event.clientX, event.clientY);
			}}
			onClick={(event) => {
				event.stopPropagation();
				placeAtPointer(event.clientX, event.clientY);
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					const rect = e.currentTarget.getBoundingClientRect();
					placeAtPointer(
						rect.left + rect.width / 2,
						rect.top + rect.height / 2,
					);
				}
			}}
			role="button"
			tabIndex={0}
			aria-label={`Click to place ${pendingFieldType} field`}
		/>
	);
}

type PlacementPageHighlightProps = {
	pendingFieldType: SignatureField["type"] | null;
};

/** Fixed-position rubber-band shown while Cmd/Ctrl+drag multi-select is active. */
export function PlacementMarqueeOverlay({ rect }: { rect: ClientRect | null }) {
	if (!rect || rect.width <= 0 || rect.height <= 0) {
		return null;
	}

	return (
		<div
			className="pointer-events-none fixed z-50 border border-primary bg-primary/10"
			style={{
				left: rect.left,
				top: rect.top,
				width: rect.width,
				height: rect.height,
			}}
		/>
	);
}

/** Per-page placement affordance shown on each document page while placing. */
export function PlacementPageHighlight({
	pendingFieldType,
}: PlacementPageHighlightProps) {
	if (!pendingFieldType) {
		return null;
	}

	return (
		<div className="pointer-events-none absolute inset-0 z-20 border-2 border-dashed border-secondary/50 bg-secondary/20">
			<div className="absolute left-2 top-2 max-w-min(100%,72) rounded bg-background px-2 py-1 text-xs text-foreground">
				Click the page to place {pendingFieldType}
			</div>
		</div>
	);
}
