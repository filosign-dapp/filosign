import type * as React from "react";
import type { SignatureField } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";

type PlacementCaptureLayerProps = {
	isPlacingField: boolean;
	pendingFieldType: SignatureField["type"] | null;
	onDocumentClick: (event: React.MouseEvent) => void;
};

export function PlacementCaptureLayer({
	isPlacingField,
	pendingFieldType,
	onDocumentClick,
}: PlacementCaptureLayerProps) {
	if (!isPlacingField) {
		return (
			<div className="absolute inset-0 w-full h-full pointer-events-auto cursor-default bg-transparent" />
		);
	}

	return (
		<>
			<div
				className="absolute inset-0 w-full h-full pointer-events-auto cursor-crosshair bg-blue-500/5 z-20"
				onClick={onDocumentClick}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						onDocumentClick(e as unknown as React.MouseEvent);
					}
				}}
				role="button"
				tabIndex={0}
				aria-label={`Click to place ${pendingFieldType} field. Use Enter or Space to place at center.`}
			/>
			<div className="absolute inset-0 border-2 border-dashed border-secondary/50 bg-secondary/20 pointer-events-none z-20">
				<div className="absolute top-2 left-2 max-w-[min(100%,18rem)] rounded bg-secondary px-2 py-1 text-xs text-primary">
					Click to place — choose signer and required/optional in the dialog
				</div>
			</div>
		</>
	);
}
