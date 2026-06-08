import type {
	FieldCompletion,
	FieldCompletionWireRow,
	PlacementField,
} from "@filosign/shared";
import { Input } from "@/src/lib/components/ui/input";
import { Skeleton } from "@/src/lib/components/ui/skeleton";
import { signerAccentColor } from "@/src/lib/domains/files/field-box";
import { PlacementFieldChrome } from "@/src/lib/domains/files/placement-field-chrome";
import { signatureFieldTypeLabel } from "@/src/lib/domains/files/placement-field-display";
import { normalizedRectToCssPercentStyle } from "@/src/lib/domains/files/placement-viewport";
import { cn } from "@/src/lib/utils";
import type {
	CompletionSource,
	OverlayFieldRenderPlan,
} from "./overlay-field-state";

function VisualPreviewContent({
	completion,
}: {
	completion: FieldCompletion | FieldCompletionWireRow;
}) {
	if (completion.previewUrl) {
		return (
			<img
				src={completion.previewUrl}
				alt=""
				className="h-full w-full object-contain"
			/>
		);
	}

	return <Skeleton className="h-full w-full rounded-sm bg-muted/60" />;
}

function fieldAccent(field: PlacementField): string {
	return signerAccentColor(field.assignedRecipientEmail ?? "");
}

type PlacementFieldOverlayItemProps = {
	field: PlacementField;
	typeLabel: string;
	plan: OverlayFieldRenderPlan;
	completion: CompletionSource;
	overlayClassName: string;
	alreadySigned: boolean;
	onToggleField?: (field: PlacementField) => void;
	onTextChange?: (fieldId: string, value: string) => void;
};

export function PlacementFieldOverlayItem({
	field,
	typeLabel,
	plan,
	completion,
	overlayClassName,
	alreadySigned,
	onToggleField,
	onTextChange,
}: PlacementFieldOverlayItemProps) {
	const style = normalizedRectToCssPercentStyle(field.rect);
	const accent = fieldAccent(field);

	switch (plan.kind) {
		case "placeholder":
			return (
				<div
					className={cn(
						"placement-field-overlay pointer-events-none absolute",
						overlayClassName,
					)}
					style={style}
				>
					<PlacementFieldChrome
						type={field.type}
						primaryLabel={typeLabel}
						assigneeEmail={field.assignedRecipientEmail}
						required={field.required}
						accentColor={accent}
						variant="muted"
					/>
				</div>
			);

		case "readonly-visual":
			return (
				<div
					className={cn(
						"placement-field-overlay pointer-events-none absolute",
						overlayClassName,
					)}
					style={style}
				>
					<PlacementFieldChrome
						type={field.type}
						primaryLabel={typeLabel}
						accentColor={accent}
						variant="applied"
					>
						<VisualPreviewContent completion={plan.completion} />
					</PlacementFieldChrome>
				</div>
			);

		case "readonly-text":
			return (
				<div
					className={cn(
						"placement-field-overlay pointer-events-none absolute",
						overlayClassName,
					)}
					style={style}
				>
					<PlacementFieldChrome
						type={field.type}
						primaryLabel={typeLabel}
						accentColor={accent}
						variant="applied"
					>
						<span className="truncate">{plan.text}</span>
					</PlacementFieldChrome>
				</div>
			);

		case "readonly-empty-placeholder":
		case "readonly-missing-placeholder":
			return (
				<div
					className={cn(
						"placement-field-overlay pointer-events-none absolute",
						overlayClassName,
					)}
					style={style}
				>
					<PlacementFieldChrome
						type={field.type}
						primaryLabel={typeLabel}
						assigneeEmail={field.assignedRecipientEmail}
						required={field.required}
						accentColor={accent}
						variant="muted"
					/>
				</div>
			);

		case "readonly-empty-hidden":
		case "readonly-missing-hidden":
			return null;

		case "interactive-text":
			return (
				<div
					className={cn(
						"placement-field-overlay pointer-events-auto absolute z-10",
						overlayClassName,
					)}
					style={style}
				>
					<PlacementFieldChrome
						type={field.type}
						primaryLabel={typeLabel}
						accentColor={accent}
						variant="pending"
						className="p-0 shadow-md"
					>
						<Input
							value={completion?.textValue ?? ""}
							onChange={(e) => onTextChange?.(field.id, e.target.value)}
							placeholder={field.required ? "Required…" : "Optional…"}
							name={`placement-field-${field.id}`}
							autoComplete="off"
							spellCheck={false}
							className="h-full w-full border-0 bg-transparent text-xs text-placement-chrome-foreground shadow-none placeholder:text-placement-chrome-muted-foreground focus-visible:ring-0"
							aria-label={`${typeLabel}, page ${field.pageIndex + 1}`}
						/>
					</PlacementFieldChrome>
				</div>
			);

		case "interactive-checkbox":
			return (
				<button
					type="button"
					disabled={alreadySigned}
					className={cn(
						"placement-field-overlay pointer-events-auto absolute z-10",
						overlayClassName,
						alreadySigned && "opacity-70",
					)}
					style={style}
					onClick={() => onToggleField?.(field)}
					aria-label={`${typeLabel}, page ${field.pageIndex + 1}`}
				>
					<PlacementFieldChrome
						type={field.type}
						primaryLabel={typeLabel}
						secondaryLabel={
							plan.checked ? "Checked (tap to clear)" : "Tap to check"
						}
						required={field.required}
						accentColor={accent}
						variant="pending"
					/>
				</button>
			);

		case "interactive-visual":
			return (
				<button
					type="button"
					disabled={alreadySigned}
					className={cn(
						"placement-field-overlay absolute z-10",
						!alreadySigned &&
							"pointer-events-auto cursor-pointer hover:brightness-110",
						overlayClassName,
					)}
					style={style}
					onClick={() => onToggleField?.(field)}
					aria-label={
						alreadySigned
							? `${typeLabel}, page ${field.pageIndex + 1}`
							: `Clear ${typeLabel}, page ${field.pageIndex + 1}`
					}
				>
					<PlacementFieldChrome
						type={field.type}
						primaryLabel={typeLabel}
						accentColor={accent}
						variant="applied"
					>
						<VisualPreviewContent completion={plan.completion} />
					</PlacementFieldChrome>
				</button>
			);

		case "interactive-applied-text":
			return (
				<button
					type="button"
					disabled={alreadySigned}
					className={cn(
						"placement-field-overlay absolute z-10",
						!alreadySigned &&
							"pointer-events-auto cursor-pointer hover:brightness-110",
						overlayClassName,
					)}
					style={style}
					onClick={() => onToggleField?.(field)}
					aria-label={
						alreadySigned
							? `${typeLabel}, page ${field.pageIndex + 1}`
							: `Clear ${typeLabel}, page ${field.pageIndex + 1}`
					}
				>
					<PlacementFieldChrome
						type={field.type}
						primaryLabel={typeLabel}
						accentColor={accent}
						variant="applied"
					>
						<span className="truncate">{plan.text}</span>
					</PlacementFieldChrome>
				</button>
			);

		case "interactive-signed-readonly":
			return (
				<div
					className={cn(
						"placement-field-overlay absolute z-10",
						overlayClassName,
					)}
					style={style}
				>
					<PlacementFieldChrome
						type={field.type}
						primaryLabel={plan.typeLabel}
						accentColor={accent}
						variant="complete"
					/>
				</div>
			);

		case "interactive-tap":
			return (
				<button
					type="button"
					className={cn(
						"placement-field-overlay pointer-events-auto absolute z-10",
						overlayClassName,
					)}
					style={style}
					onClick={() => onToggleField?.(field)}
					aria-label={`${plan.label}, page ${field.pageIndex + 1}`}
				>
					<PlacementFieldChrome
						type={field.type}
						primaryLabel={signatureFieldTypeLabel(field.type)}
						secondaryLabel={plan.label}
						required={field.required}
						accentColor={accent}
						variant="pending"
					/>
				</button>
			);
	}
}
