import type { FieldCompletionMap, PlacementField } from "@filosign/shared";
import { memo } from "react";
import { Input } from "@/src/lib/components/ui/input";
import { cn } from "@/src/lib/utils";

type PlacementFieldOverlayProps = {
	pageIndex: number;
	fields: PlacementField[];
	fieldCompletions: FieldCompletionMap;
	completedFieldIds: string[];
	alreadySigned: boolean;
	onApplyField: (field: PlacementField) => void;
	onTextChange: (fieldId: string, value: string) => void;
	onCheckboxToggle: (fieldId: string) => void;
};

function fieldStyle(rect: PlacementField["rect"]) {
	return {
		left: `${rect.x * 100}%`,
		top: `${rect.y * 100}%`,
		width: `${Math.max(rect.width * 100, 8)}%`,
		height: `${Math.max(rect.height * 100, 5)}%`,
	};
}

export const PlacementFieldOverlay = memo(function PlacementFieldOverlay({
	pageIndex,
	fields,
	fieldCompletions,
	completedFieldIds,
	alreadySigned,
	onApplyField,
	onTextChange,
	onCheckboxToggle,
}: PlacementFieldOverlayProps) {
	return (
		<>
			{fields
				.filter((f) => f.pageIndex === pageIndex)
				.map((field) => {
					const completion = fieldCompletions[field.id];
					const done = alreadySigned || completedFieldIds.includes(field.id);
					const style = fieldStyle(field.rect);

					if (field.type === "text" && !alreadySigned) {
						return (
							<div
								key={field.id}
								className="pointer-events-auto absolute z-10"
								style={style}
							>
								<Input
									value={completion?.textValue ?? ""}
									onChange={(e) => onTextChange(field.id, e.target.value)}
									placeholder={field.required ? "Required" : "Optional"}
									className="h-full w-full border-primary/40 bg-background/90 text-[10px]"
								/>
							</div>
						);
					}

					if (field.type === "checkbox") {
						const checked = completion?.textValue === "true";
						return (
							<button
								key={field.id}
								type="button"
								disabled={alreadySigned}
								className={cn(
									"pointer-events-auto absolute z-10 flex items-center justify-center rounded border-2 bg-background/85",
									checked ? "border-emerald-600" : "border-muted-foreground/40",
								)}
								style={style}
								onClick={() => onCheckboxToggle(field.id)}
							>
								<span className="text-sm leading-none">
									{checked ? "✓" : ""}
								</span>
							</button>
						);
					}

					if (
						completion?.valueKind === "visual" &&
						(completion.previewUrl || completion.textValue)
					) {
						return (
							<div
								key={field.id}
								className="pointer-events-none absolute z-10 overflow-hidden rounded border border-border/50 bg-white/90"
								style={style}
							>
								{completion.previewUrl ? (
									<img
										src={completion.previewUrl}
										alt={field.type}
										className="h-full w-full object-contain"
									/>
								) : null}
							</div>
						);
					}

					if (
						completion?.textValue &&
						(field.type === "date" ||
							field.type === "name" ||
							field.type === "email" ||
							field.type === "text")
					) {
						return (
							<div
								key={field.id}
								className="pointer-events-none absolute z-10 flex items-center overflow-hidden rounded border border-border/40 bg-white/90 px-1"
								style={style}
							>
								<span className="truncate text-[10px] text-foreground">
									{completion.textValue}
								</span>
							</div>
						);
					}

					return (
						<button
							key={field.id}
							type="button"
							disabled={alreadySigned}
							className={cn(
								"pointer-events-auto absolute z-10 flex items-center justify-center rounded border-2 border-dashed px-0.5 text-[9px] font-medium transition-colors",
								done
									? "border-emerald-600/60 bg-emerald-500/10 text-emerald-900"
									: "border-primary/50 bg-primary/5 text-primary hover:bg-primary/10",
							)}
							style={style}
							onClick={() => onApplyField(field)}
						>
							{alreadySigned
								? field.type
								: done
									? "Applied"
									: field.required
										? `Tap — ${field.type}`
										: field.type}
						</button>
					);
				})}
		</>
	);
});
