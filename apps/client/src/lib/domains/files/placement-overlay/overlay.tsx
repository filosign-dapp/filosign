import type {
	FieldCompletion,
	FieldCompletionMap,
	FieldCompletionWireRow,
	PlacementField,
} from "@filosign/shared";
import { fieldCompletionStatus } from "@filosign/shared";
import { memo } from "react";
import { Input } from "@/src/lib/components/ui/input";
import { Skeleton } from "@/src/lib/components/ui/skeleton";
import {
	SignatureFieldTypeIcon,
	signatureFieldTypeLabel,
} from "@/src/lib/domains/files/placement-field-display";
import { normalizedRectToCssPercentStyle } from "@/src/lib/domains/files/placement-viewport";
import { cn } from "@/src/lib/utils";

export type PlacementOverlayMode = "interactive" | "readonly" | "placeholder";

type CompletionSource = FieldCompletion | FieldCompletionWireRow | undefined;

type PlacementOverlayProps = {
	pageIndex: number;
	fields: PlacementField[];
	mode: PlacementOverlayMode;
	completions?: FieldCompletionMap | FieldCompletionWireRow[];
	alreadySigned?: boolean;
	onToggleField?: (field: PlacementField) => void;
	onTextChange?: (fieldId: string, value: string) => void;
	overlayClassName?: string;
	/** When mode is readonly, render muted placeholders for fields without completions. */
	showPlaceholders?: boolean;
};

function completionForField(
	fieldId: string,
	completions: PlacementOverlayProps["completions"],
): CompletionSource {
	if (!completions) return undefined;
	if (Array.isArray(completions)) {
		return completions.find((row) => row.fieldId === fieldId);
	}
	return completions[fieldId];
}

function pendingFieldLabel(field: PlacementField): string {
	return signatureFieldTypeLabel(field.type);
}

function fieldHasDisplayCompletion(
	field: PlacementField,
	completion: CompletionSource,
): completion is FieldCompletion | FieldCompletionWireRow {
	if (!completion) return false;
	return fieldCompletionStatus(
		field,
		completion as FieldCompletion,
		[],
		"display",
	);
}

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

export const PlacementOverlay = memo(function PlacementOverlay({
	pageIndex,
	fields,
	mode,
	completions,
	alreadySigned = false,
	onToggleField,
	onTextChange,
	overlayClassName = "z-10",
	showPlaceholders = false,
}: PlacementOverlayProps) {
	const pageFields = fields.filter((f) => f.pageIndex === pageIndex);

	return (
		<>
			{pageFields.map((field) => {
				const completion = completionForField(field.id, completions);
				const style = normalizedRectToCssPercentStyle(field.rect);
				const typeLabel = signatureFieldTypeLabel(field.type);

				if (mode === "placeholder") {
					return (
						<div
							key={field.id}
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

				if (mode === "readonly") {
					if (
						completion?.valueKind === "visual" &&
						fieldHasDisplayCompletion(field, completion)
					) {
						return (
							<div
								key={field.id}
								className={cn(
									"placement-field-applied-shell pointer-events-none absolute",
									overlayClassName,
								)}
								style={style}
							>
								<div className="placement-field-applied-fill">
									<VisualPreviewContent completion={completion} />
								</div>
							</div>
						);
					}

					if (
						fieldHasDisplayCompletion(field, completion) &&
						completion?.textValue
					) {
						const text =
							completion.valueKind === "checkbox"
								? completion.textValue === "true"
									? "✓"
									: ""
								: completion.textValue;
						if (!text) {
							if (showPlaceholders) {
								return (
									<div
										key={field.id}
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
							return null;
						}
						return (
							<div
								key={field.id}
								className={cn(
									"placement-field-applied-shell pointer-events-none absolute",
									overlayClassName,
								)}
								style={style}
							>
								<div className="placement-field-applied-fill">
									<span className="truncate">{text}</span>
								</div>
							</div>
						);
					}

					if (showPlaceholders) {
						return (
							<div
								key={field.id}
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

					return null;
				}

				if (field.type === "text" && !alreadySigned) {
					return (
						<div
							key={field.id}
							className="pointer-events-auto absolute z-10"
							style={style}
						>
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
				}

				if (field.type === "checkbox") {
					const checked = completion?.textValue === "true";
					return (
						<TapFieldOverlay
							key={field.id}
							field={field}
							disabled={alreadySigned}
							label={checked ? "Checked (tap to clear)" : "Tap to check"}
							onClick={() => onToggleField?.(field)}
						/>
					);
				}

				if (
					completion?.valueKind === "visual" &&
					fieldHasDisplayCompletion(field, completion)
				) {
					return (
						<button
							key={field.id}
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
								<VisualPreviewContent completion={completion} />
							</div>
						</button>
					);
				}

				if (
					fieldHasDisplayCompletion(field, completion) &&
					completion?.textValue &&
					(field.type === "date" ||
						field.type === "name" ||
						field.type === "email")
				) {
					return (
						<button
							key={field.id}
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
								<span className="truncate">{completion.textValue}</span>
							</div>
						</button>
					);
				}

				if (alreadySigned) {
					return (
						<div
							key={field.id}
							className="placement-field-applied-shell absolute z-10 opacity-80"
							style={style}
						>
							<div className="placement-field-applied-fill text-muted-foreground">
								<span className="truncate">{typeLabel}</span>
							</div>
						</div>
					);
				}

				return (
					<TapFieldOverlay
						key={field.id}
						field={field}
						label={pendingFieldLabel(field)}
						onClick={() => onToggleField?.(field)}
					/>
				);
			})}
		</>
	);
});
