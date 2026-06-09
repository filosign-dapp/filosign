import type { FieldCompletion, FieldCompletionMap } from "./field-completion";
import {
	displayModeComplete,
	draftModeComplete,
	lazyProvisionModeComplete,
	submitModeComplete,
} from "./field-completion-by-mode";
import type { PlacementField } from "./placement";
import { zPlacementManifest } from "./placement";
import type { UserSignatureArtifact } from "./signature-artifact";

export type FieldCompletionStatusMode =
	| "display"
	| "draft"
	| "submit"
	| "lazyProvision";

export type ParsedPlacementForSigner = {
	allFields: PlacementField[];
	myFields: PlacementField[];
	requiredFields: PlacementField[];
};

export function parsePlacementManifestForSigner(
	manifest: unknown,
	signerEmail: string | null | undefined,
): ParsedPlacementForSigner {
	const empty: ParsedPlacementForSigner = {
		allFields: [],
		myFields: [],
		requiredFields: [],
	};
	if (!manifest) return empty;

	const parsed = zPlacementManifest.safeParse(manifest);
	if (!parsed.success) return empty;

	const allFields = parsed.data.fields;
	if (!signerEmail?.trim()) {
		return { allFields, myFields: [], requiredFields: [] };
	}

	const email = signerEmail.trim().toLowerCase();
	const myFields = allFields.filter((f) => f.assignedRecipientEmail === email);

	return {
		allFields,
		myFields,
		requiredFields: myFields.filter((f) => f.required),
	};
}

export function parsePlacementManifestFields(
	manifest: unknown,
): PlacementField[] {
	if (!manifest) return [];
	const parsed = zPlacementManifest.safeParse(manifest);
	return parsed.success ? parsed.data.fields : [];
}

export function fieldCompletionStatus(
	field: PlacementField,
	completion: FieldCompletion | undefined,
	completedFieldIds: readonly string[],
	mode: FieldCompletionStatusMode,
): boolean {
	const inCompletedSet = completedFieldIds.includes(field.id);

	switch (mode) {
		case "display":
			return displayModeComplete(completion);
		case "draft":
			return draftModeComplete(field, completion, inCompletedSet);
		case "submit":
			return submitModeComplete(field, completion, inCompletedSet);
		case "lazyProvision":
			return lazyProvisionModeComplete(field, completion, inCompletedSet);
	}
}

export function fieldHasCompletionValue(
	field: PlacementField,
	completions: FieldCompletionMap,
): boolean {
	return fieldCompletionStatus(
		field,
		completions[field.id],
		Object.keys(completions),
		"display",
	);
}

export function allRequiredFieldsComplete(
	fields: readonly PlacementField[],
	completions: FieldCompletionMap,
	completedFieldIds: readonly string[],
	mode: FieldCompletionStatusMode,
): boolean {
	const required = fields.filter((f) => f.required);
	if (required.length === 0) return true;
	return required.every((field) =>
		fieldCompletionStatus(
			field,
			completions[field.id],
			completedFieldIds,
			mode,
		),
	);
}

export function canLazyProvisionRequiredVisualFields(
	fields: readonly PlacementField[],
): boolean {
	return fields.some(
		(field) =>
			field.required &&
			(field.type === "signature" || field.type === "initial"),
	);
}

/** Whether the Sign CTA may proceed (fields + lazy-provision gates). */
export function canSubmitPlacementSign(args: {
	canSign: boolean;
	myPlacementFields: readonly PlacementField[];
	requiredPlacementFields: readonly PlacementField[];
	fieldCompletions: FieldCompletionMap;
	completedFieldIds: readonly string[];
}): boolean {
	if (!args.canSign || args.myPlacementFields.length === 0) return false;
	const requiredOk = allRequiredFieldsComplete(
		args.myPlacementFields,
		args.fieldCompletions,
		args.completedFieldIds,
		"lazyProvision",
	);
	const hasLeaf =
		args.completedFieldIds.length > 0 ||
		canLazyProvisionRequiredVisualFields(args.requiredPlacementFields);
	return requiredOk && hasLeaf;
}

export function fieldCompleteForSubmit(
	field: PlacementField,
	completions: FieldCompletionMap,
	completedFieldIds: readonly string[],
): boolean {
	return fieldCompletionStatus(
		field,
		completions[field.id],
		completedFieldIds,
		"submit",
	);
}

export function buildVisualCompletionFromArtifact(
	field: PlacementField,
	artifact: Pick<
		UserSignatureArtifact,
		"id" | "storageKey" | "contentSha256" | "previewUrl"
	>,
): FieldCompletion {
	return {
		fieldId: field.id,
		valueKind: "visual",
		sourceArtifactId: artifact.id,
		storageKey: artifact.storageKey,
		contentSha256: artifact.contentSha256,
		textValue: null,
		previewUrl: artifact.previewUrl,
	};
}

export function requiredFieldCompletionProgress(
	fields: readonly PlacementField[],
	completions: FieldCompletionMap,
	completedFieldIds: readonly string[],
): { completed: number; total: number; percent: number } {
	const required = fields.filter((f) => f.required);
	const total = required.length;
	if (total === 0) return { completed: 0, total: 0, percent: 100 };

	const completed = required.filter((field) =>
		fieldCompletionStatus(
			field,
			completions[field.id],
			completedFieldIds,
			"draft",
		),
	).length;

	return {
		completed,
		total,
		percent: Math.round((completed / total) * 100),
	};
}
