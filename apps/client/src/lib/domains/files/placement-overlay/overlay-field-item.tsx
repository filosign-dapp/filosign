import type {
	FieldCompletion,
	FieldCompletionWireRow,
	PlacementField,
	UserSignatureArtifact,
} from "@filosign/shared";
import { typedSignatureArtifactPreviewSrc } from "@filosign/shared";
import { Input } from "@/src/lib/components/ui/input";
import { Skeleton } from "@/src/lib/components/ui/skeleton";
import { signerAccentColor } from "@/src/lib/domains/files/field-box";
import { PlacementCheckboxField } from "@/src/lib/domains/files/placement-checkbox-field";
import { PlacementFieldChrome } from "@/src/lib/domains/files/placement-field-chrome";
import {
	compactFieldTextStyle,
	PlacementFieldCompactText,
	shouldUseCompactFieldDisplay,
} from "@/src/lib/domains/files/placement-field-compact";
import { signatureFieldTypeLabel } from "@/src/lib/domains/files/placement-field-display";
import { normalizedRectToCssPercentStyle } from "@/src/lib/domains/files/placement-viewport";
import { cn } from "@/src/lib/utils";
import type {
	CompletionSource,
	OverlayFieldRenderPlan,
} from "./overlay-field-state";

function resolveVisualArtifact(
	completion: FieldCompletion | FieldCompletionWireRow,
	signatureArtifactsById?: ReadonlyMap<string, UserSignatureArtifact>,
): Pick<
	UserSignatureArtifact,
	"kind" | "role" | "typedMeta" | "previewUrl"
> | null {
	if (!completion.sourceArtifactId || !signatureArtifactsById) return null;
	return signatureArtifactsById.get(completion.sourceArtifactId) ?? null;
}

function resolveVisualPreviewSrc(
	completion: FieldCompletion | FieldCompletionWireRow,
	signatureArtifactsById?: ReadonlyMap<string, UserSignatureArtifact>,
): string | null {
	const artifact = resolveVisualArtifact(completion, signatureArtifactsById);
	if (artifact) {
		return typedSignatureArtifactPreviewSrc({ artifact });
	}
	return completion.previewUrl;
}

function VisualPreviewContent({
	completion,
	signatureArtifactsById,
}: {
	completion: FieldCompletion | FieldCompletionWireRow;
	signatureArtifactsById?: ReadonlyMap<string, UserSignatureArtifact>;
}) {
	const previewSrc = resolveVisualPreviewSrc(
		completion,
		signatureArtifactsById,
	);

	if (previewSrc) {
		return (
			<img
				src={previewSrc}
				alt=""
				className="block h-full w-auto max-w-full min-h-0 object-contain"
			/>
		);
	}

	return <Skeleton className="size-full min-h-0 placement-field-radius" />;
}

function AppliedTextContent({
	text,
	fieldHeightPx,
}: {
	text: string;
	fieldHeightPx?: number;
}) {
	if (
		shouldUseCompactFieldDisplay(fieldHeightPx) &&
		fieldHeightPx !== undefined
	) {
		return (
			<PlacementFieldCompactText text={text} fieldHeightPx={fieldHeightPx} />
		);
	}

	return <span className="block w-full truncate text-left">{text}</span>;
}

function fieldAccent(field: PlacementField): string {
	return signerAccentColor(field.assignedRecipientEmail ?? "");
}

const placementFieldInputClassName =
	"h-full min-w-0 w-full overflow-x-auto rounded-none border-0 bg-transparent text-left text-placement-fill-interactive-foreground shadow-none placeholder:text-placement-chrome-muted-foreground focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent";

type PlacementFieldOverlayItemProps = {
	field: PlacementField;
	typeLabel: string;
	plan: OverlayFieldRenderPlan;
	completion: CompletionSource;
	overlayClassName: string;
	alreadySigned: boolean;
	fieldHeightPx?: number;
	signatureArtifactsById?: ReadonlyMap<string, UserSignatureArtifact>;
	onToggleField?: (field: PlacementField) => void;
	getTextFieldValue?: (fieldId: string) => string;
	onTextDraftChange?: (fieldId: string, value: string) => void;
	onTextFocus?: (fieldId: string) => void;
	onTextBlur?: (fieldId: string) => void;
};

export function PlacementFieldOverlayItem({
	field,
	typeLabel,
	plan,
	completion,
	overlayClassName,
	alreadySigned,
	fieldHeightPx,
	signatureArtifactsById,
	onToggleField,
	getTextFieldValue,
	onTextDraftChange,
	onTextFocus,
	onTextBlur,
}: PlacementFieldOverlayItemProps) {
	const style = normalizedRectToCssPercentStyle(field.rect);
	const accent = fieldAccent(field);
	const compact = shouldUseCompactFieldDisplay(fieldHeightPx);

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
						fieldHeightPx={fieldHeightPx}
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
						contentFill="preview"
						fieldHeightPx={fieldHeightPx}
					>
						<VisualPreviewContent
							completion={plan.completion}
							signatureArtifactsById={signatureArtifactsById}
						/>
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
						variant="pending"
						contentFill="interactive"
						fieldHeightPx={fieldHeightPx}
					>
						<AppliedTextContent
							text={plan.text}
							fieldHeightPx={fieldHeightPx}
						/>
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
						fieldHeightPx={fieldHeightPx}
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
					{compact && fieldHeightPx !== undefined ? (
						<PlacementFieldChrome
							type={field.type}
							primaryLabel={typeLabel}
							accentColor={accent}
							variant="pending"
							className="p-0 shadow-md"
							fieldHeightPx={fieldHeightPx}
						>
							<Input
								value={
									getTextFieldValue?.(field.id) ?? completion?.textValue ?? ""
								}
								onChange={(e) => onTextDraftChange?.(field.id, e.target.value)}
								onFocus={() => onTextFocus?.(field.id)}
								onBlur={() => onTextBlur?.(field.id)}
								placeholder={field.required ? "Required…" : "Optional…"}
								name={`placement-field-${field.id}`}
								autoComplete="off"
								spellCheck={false}
								className={cn(placementFieldInputClassName, "px-0.5")}
								style={compactFieldTextStyle(fieldHeightPx)}
								aria-label={`${typeLabel}, page ${field.pageIndex + 1}`}
							/>
						</PlacementFieldChrome>
					) : (
						<PlacementFieldChrome
							type={field.type}
							primaryLabel={typeLabel}
							accentColor={accent}
							variant="pending"
							className="p-0 shadow-md"
							fieldHeightPx={fieldHeightPx}
						>
							<Input
								value={
									getTextFieldValue?.(field.id) ?? completion?.textValue ?? ""
								}
								onChange={(e) => onTextDraftChange?.(field.id, e.target.value)}
								onFocus={() => onTextFocus?.(field.id)}
								onBlur={() => onTextBlur?.(field.id)}
								placeholder={field.required ? "Required…" : "Optional…"}
								name={`placement-field-${field.id}`}
								autoComplete="off"
								spellCheck={false}
								className={cn(placementFieldInputClassName, "text-xs")}
								aria-label={`${typeLabel}, page ${field.pageIndex + 1}`}
							/>
						</PlacementFieldChrome>
					)}
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
					aria-label={`${typeLabel}${plan.checked ? ", checked" : ""}, page ${field.pageIndex + 1}`}
					aria-pressed={plan.checked}
				>
					<PlacementCheckboxField
						checked={plan.checked}
						accentColor={accent}
						fieldHeightPx={fieldHeightPx}
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
						contentFill="preview"
						fieldHeightPx={fieldHeightPx}
					>
						<VisualPreviewContent
							completion={plan.completion}
							signatureArtifactsById={signatureArtifactsById}
						/>
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
						variant="pending"
						contentFill="interactive"
						fieldHeightPx={fieldHeightPx}
					>
						<AppliedTextContent
							text={plan.text}
							fieldHeightPx={fieldHeightPx}
						/>
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
						fieldHeightPx={fieldHeightPx}
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
						required={field.required}
						accentColor={accent}
						variant="pending"
						fieldHeightPx={fieldHeightPx}
					/>
				</button>
			);

		case "interactive-provisioning":
			return (
				<div
					className={cn(
						"placement-field-overlay pointer-events-none absolute z-10",
						overlayClassName,
					)}
					style={style}
					role="status"
					aria-live="polite"
					aria-busy="true"
					aria-label={`Loading ${typeLabel}, page ${field.pageIndex + 1}`}
				>
					<PlacementFieldChrome
						type={field.type}
						primaryLabel={signatureFieldTypeLabel(field.type)}
						required={field.required}
						accentColor={accent}
						variant="pending"
						loading
						fieldHeightPx={fieldHeightPx}
					/>
				</div>
			);
	}
}
