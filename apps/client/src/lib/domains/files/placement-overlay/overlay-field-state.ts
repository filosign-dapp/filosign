import type {
	FieldCompletion,
	FieldCompletionMap,
	FieldCompletionWireRow,
	PlacementField,
} from "@filosign/shared";
import { fieldCompletionStatus } from "@filosign/shared";
import { signatureFieldTypeLabel } from "@/src/lib/domains/files/placement-field-display";

export type PlacementOverlayMode = "interactive" | "readonly" | "placeholder";

type CompletionSource = FieldCompletion | FieldCompletionWireRow | undefined;

export type OverlayFieldRenderPlan =
	| { kind: "placeholder" }
	| {
			kind: "readonly-visual";
			completion: FieldCompletion | FieldCompletionWireRow;
	  }
	| { kind: "readonly-text"; text: string }
	| { kind: "readonly-empty-placeholder" }
	| { kind: "readonly-empty-hidden" }
	| { kind: "readonly-missing-placeholder" }
	| { kind: "readonly-missing-hidden" }
	| { kind: "interactive-text" }
	| { kind: "interactive-checkbox"; checked: boolean }
	| {
			kind: "interactive-visual";
			completion: FieldCompletion | FieldCompletionWireRow;
	  }
	| {
			kind: "interactive-applied-text";
			completion: FieldCompletion | FieldCompletionWireRow;
			text: string;
	  }
	| { kind: "interactive-signed-readonly"; typeLabel: string }
	| { kind: "interactive-tap"; label: string }
	| { kind: "interactive-provisioning" };

export type DeriveOverlayFieldStateInput = {
	field: PlacementField;
	mode: PlacementOverlayMode;
	completions: FieldCompletionMap | FieldCompletionWireRow[] | undefined;
	alreadySigned: boolean;
	showPlaceholders: boolean;
	provisioningFieldIds?: ReadonlySet<string>;
};

function completionForField(
	fieldId: string,
	completions: DeriveOverlayFieldStateInput["completions"],
): CompletionSource {
	if (!completions) return undefined;
	if (Array.isArray(completions)) {
		return completions.find((row) => row.fieldId === fieldId);
	}
	return completions[fieldId];
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

function pendingFieldLabel(field: PlacementField): string {
	return signatureFieldTypeLabel(field.type);
}

function deriveReadonlyOverlayFieldState(
	field: PlacementField,
	completion: CompletionSource,
	showPlaceholders: boolean,
): OverlayFieldRenderPlan {
	if (
		completion?.valueKind === "visual" &&
		fieldHasDisplayCompletion(field, completion)
	) {
		return { kind: "readonly-visual", completion };
	}

	if (fieldHasDisplayCompletion(field, completion) && completion?.textValue) {
		const text =
			completion.valueKind === "checkbox"
				? completion.textValue === "true"
					? "✓"
					: ""
				: completion.textValue;
		if (!text) {
			return showPlaceholders
				? { kind: "readonly-empty-placeholder" }
				: { kind: "readonly-empty-hidden" };
		}
		return { kind: "readonly-text", text };
	}

	return showPlaceholders
		? { kind: "readonly-missing-placeholder" }
		: { kind: "readonly-missing-hidden" };
}

function deriveInteractiveOverlayFieldState(
	field: PlacementField,
	completion: CompletionSource,
	alreadySigned: boolean,
	typeLabel: string,
	provisioningFieldIds?: ReadonlySet<string>,
): OverlayFieldRenderPlan {
	if (
		provisioningFieldIds?.has(field.id) &&
		(field.type === "signature" || field.type === "initial")
	) {
		return { kind: "interactive-provisioning" };
	}

	if (field.type === "text" && !alreadySigned) {
		return { kind: "interactive-text" };
	}

	if (field.type === "checkbox") {
		return {
			kind: "interactive-checkbox",
			checked: completion?.textValue === "true",
		};
	}

	if (
		completion?.valueKind === "visual" &&
		fieldHasDisplayCompletion(field, completion)
	) {
		return { kind: "interactive-visual", completion };
	}

	if (
		fieldHasDisplayCompletion(field, completion) &&
		completion?.textValue &&
		(field.type === "text" ||
			field.type === "date" ||
			field.type === "name" ||
			field.type === "email")
	) {
		return {
			kind: "interactive-applied-text",
			completion,
			text: completion.textValue,
		};
	}

	if (alreadySigned) {
		return { kind: "interactive-signed-readonly", typeLabel };
	}

	return { kind: "interactive-tap", label: pendingFieldLabel(field) };
}

export function deriveOverlayFieldState(input: DeriveOverlayFieldStateInput): {
	typeLabel: string;
	plan: OverlayFieldRenderPlan;
} {
	const {
		field,
		mode,
		completions,
		alreadySigned,
		showPlaceholders,
		provisioningFieldIds,
	} = input;
	const completion = completionForField(field.id, completions);
	const typeLabel = signatureFieldTypeLabel(field.type);

	if (mode === "placeholder") {
		return { typeLabel, plan: { kind: "placeholder" } };
	}

	if (mode === "readonly") {
		return {
			typeLabel,
			plan: deriveReadonlyOverlayFieldState(
				field,
				completion,
				showPlaceholders,
			),
		};
	}

	return {
		typeLabel,
		plan: deriveInteractiveOverlayFieldState(
			field,
			completion,
			alreadySigned,
			typeLabel,
			provisioningFieldIds,
		),
	};
}

export type { CompletionSource };
