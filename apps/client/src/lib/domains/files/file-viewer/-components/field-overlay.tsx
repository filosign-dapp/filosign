import type { FieldCompletionWireRow, PlacementField } from "@filosign/shared";
import { memo } from "react";
import { cn } from "@/src/lib/utils";

type FileViewerFieldOverlayProps = {
	pageIndex: number;
	fields: PlacementField[];
	completions: FieldCompletionWireRow[];
	/** Dashed field-type placeholder when a field has no persisted completion. */
	showPlaceholders?: boolean;
	overlayClassName?: string;
};

function rectStyle(rect: PlacementField["rect"]) {
	return {
		left: `${rect.x * 100}%`,
		top: `${rect.y * 100}%`,
		width: `${Math.max(rect.width * 100, 8)}%`,
		height: `${Math.max(rect.height * 100, 5)}%`,
	};
}

export const FileViewerFieldOverlay = memo(function FileViewerFieldOverlay({
	pageIndex,
	fields,
	completions,
	showPlaceholders = false,
	overlayClassName = "z-10",
}: FileViewerFieldOverlayProps) {
	const byFieldId = new Map(completions.map((c) => [c.fieldId, c]));

	return (
		<>
			{fields
				.filter((f) => f.pageIndex === pageIndex)
				.map((field) => {
					const completion = byFieldId.get(field.id);
					const style = rectStyle(field.rect);

					if (completion?.valueKind === "visual" && completion.previewUrl) {
						return (
							<div
								key={field.id}
								className={cn(
									"pointer-events-none absolute overflow-hidden rounded border border-border/40 bg-white/90",
									overlayClassName,
								)}
								style={style}
							>
								<img
									src={completion.previewUrl}
									alt={field.type}
									className="h-full w-full object-contain"
								/>
							</div>
						);
					}

					if (completion?.textValue) {
						const text =
							completion.valueKind === "checkbox"
								? completion.textValue === "true"
									? "✓"
									: ""
								: completion.textValue;
						if (!text) return null;
						return (
							<div
								key={field.id}
								className={cn(
									"pointer-events-none absolute flex items-center overflow-hidden rounded border border-border/30 bg-white/90 px-1",
									overlayClassName,
								)}
								style={style}
							>
								<span className="truncate text-[10px] text-foreground">
									{text}
								</span>
							</div>
						);
					}

					if (!showPlaceholders) return null;

					return (
						<div
							key={field.id}
							className={cn(
								"pointer-events-none absolute flex items-center justify-center rounded border border-dashed border-border/80 bg-muted/25 px-0.5 text-[9px] font-medium uppercase tracking-tight text-muted-foreground",
								overlayClassName,
							)}
							style={style}
							title={field.assignedRecipientEmail ?? undefined}
						>
							{field.type}
						</div>
					);
				})}
		</>
	);
});
