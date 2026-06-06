import type {
	FieldCompletion,
	FieldCompletionWireRow,
	PlacementField,
} from "@filosign/shared";
import { Input } from "@/src/lib/components/ui/input";
import { Skeleton } from "@/src/lib/components/ui/skeleton";
import { SignatureFieldTypeIcon } from "@/src/lib/domains/files/placement-field-display";
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

function TapFieldOverlay({
	field,
	label,
	onClick,
	disabled,
}: {
	field: PlacementField;
	label: string;
	onClick: () => void;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			disabled={disabled}
			className={cn(
				"placement-field-chrome-interactive pointer-events-auto absolute z-10 justify-center",
				disabled && "opacity-70",
				"flex-1",
			)}
			style={normalizedRectToCssPercentStyle(field.rect)}
			onClick={onClick}
			aria-label={`${label}, page ${field.pageIndex + 1}`}
		>
			<span className="shrink-0" aria-hidden="true">
				<SignatureFieldTypeIcon type={field.type} isMobile />
			</span>
			<span className="placement-field-label">{label}</span>
		</button>
	);
}

function MutedPlaceholderField({
	field,
	typeLabel,
	overlayClassName,
}: {
	field: PlacementField;
	typeLabel: string;
	overlayClassName: string;
}) {
	const style = normalizedRectToCssPercentStyle(field.rect);
	return (
		<div
			className={cn(
				"placement-field-chrome-muted pointer-events-none absolute",
				overlayClassName,
			)}
			style={style}
			title={field.assignedRecipientEmail ?? undefined}
		>
			<span className="shrink-0" aria-hidden="true">
				<SignatureFieldTypeIcon type={field.type} isMobile />
			</span>
			<div className="min-w-0 flex-1 leading-none">
				<div className="placement-field-label">{typeLabel}</div>
				<div className="placement-field-subtle">
					{field.assignedRecipientEmail ?? "Assignee"}
				</div>
			</div>
		</div>
	);
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

	switch (plan.kind) {
		case "placeholder":
			return (
				<MutedPlaceholderField
					field={field}
					typeLabel={typeLabel}
					overlayClassName={overlayClassName}
				/>
			);

		case "readonly-visual":
			return (
				<div
					className={cn(
						"placement-field-applied-shell pointer-events-none absolute",
						overlayClassName,
					)}
					style={style}
				>
					<div className="placement-field-applied-fill">
						<VisualPreviewContent completion={plan.completion} />
					</div>
				</div>
			);

		case "readonly-text":
			return (
				<div
					className={cn(
						"placement-field-applied-shell pointer-events-none absolute",
						overlayClassName,
					)}
					style={style}
				>
					<div className="placement-field-applied-fill">
						<span className="truncate">{plan.text}</span>
					</div>
				</div>
			);

		case "readonly-empty-placeholder":
		case "readonly-missing-placeholder":
			return (
				<MutedPlaceholderField
					field={field}
					typeLabel={typeLabel}
					overlayClassName={overlayClassName}
				/>
			);

		case "readonly-empty-hidden":
		case "readonly-missing-hidden":
			return null;

		case "interactive-text":
			return (
				<div className="pointer-events-auto absolute z-10" style={style}>
					<Input
						value={completion?.textValue ?? ""}
						onChange={(e) => onTextChange?.(field.id, e.target.value)}
						placeholder={field.required ? "Required…" : "Optional…"}
						name={`placement-field-${field.id}`}
						autoComplete="off"
						spellCheck={false}
						className={cn(
							"placement-field-chrome h-full w-full border-placement-chrome-border bg-placement-chrome text-xs text-placement-chrome-foreground placeholder:text-placement-chrome-muted-foreground",
						)}
						aria-label={`${typeLabel}, page ${field.pageIndex + 1}`}
					/>
				</div>
			);

		case "interactive-checkbox":
			return (
				<TapFieldOverlay
					field={field}
					disabled={alreadySigned}
					label={plan.checked ? "Checked (tap to clear)" : "Tap to check"}
					onClick={() => onToggleField?.(field)}
				/>
			);

		case "interactive-visual":
			return (
				<button
					type="button"
					disabled={alreadySigned}
					className={cn(
						"placement-field-applied-shell absolute z-10",
						!alreadySigned &&
							"pointer-events-auto cursor-pointer hover:brightness-110",
					)}
					style={style}
					onClick={() => onToggleField?.(field)}
					aria-label={
						alreadySigned
							? `${typeLabel}, page ${field.pageIndex + 1}`
							: `Clear ${typeLabel}, page ${field.pageIndex + 1}`
					}
				>
					<div className="placement-field-applied-fill">
						<VisualPreviewContent completion={plan.completion} />
					</div>
				</button>
			);

		case "interactive-applied-text":
			return (
				<button
					type="button"
					disabled={alreadySigned}
					className={cn(
						"placement-field-applied-shell absolute z-10",
						!alreadySigned &&
							"pointer-events-auto cursor-pointer hover:brightness-110",
					)}
					style={style}
					onClick={() => onToggleField?.(field)}
					aria-label={
						alreadySigned
							? `${typeLabel}, page ${field.pageIndex + 1}`
							: `Clear ${typeLabel}, page ${field.pageIndex + 1}`
					}
				>
					<div className="placement-field-applied-fill">
						<span className="truncate">{plan.text}</span>
					</div>
				</button>
			);

		case "interactive-signed-readonly":
			return (
				<div
					className="placement-field-applied-shell absolute z-10 opacity-80"
					style={style}
				>
					<div className="placement-field-applied-fill text-muted-foreground">
						<span className="truncate">{plan.typeLabel}</span>
					</div>
				</div>
			);

		case "interactive-tap":
			return (
				<TapFieldOverlay
					field={field}
					label={plan.label}
					onClick={() => onToggleField?.(field)}
				/>
			);
	}
}
