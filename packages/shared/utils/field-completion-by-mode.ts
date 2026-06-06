import type { FieldCompletion } from "./field-completion";
import type { PlacementField } from "./placement";

function visualHasStorage(completion: FieldCompletion | undefined): boolean {
	return Boolean(completion?.storageKey?.trim());
}

function visualHasDisplayPreview(
	completion: FieldCompletion | undefined,
): boolean {
	if (!completion || completion.valueKind !== "visual") return false;
	return Boolean(completion.previewUrl || completion.storageKey);
}

function textValuePresent(completion: FieldCompletion | undefined): boolean {
	return Boolean(completion?.textValue?.trim());
}

function checkboxChecked(completion: FieldCompletion | undefined): boolean {
	return (
		completion?.valueKind === "checkbox" && completion.textValue === "true"
	);
}

function visualCompletionComplete(
	completion: FieldCompletion | undefined,
): boolean {
	return completion?.valueKind === "visual" && visualHasStorage(completion);
}

function checkboxCompletionComplete(
	completion: FieldCompletion | undefined,
): boolean {
	return completion?.valueKind === "checkbox";
}

function textCompletionComplete(
	completion: FieldCompletion | undefined,
): boolean {
	return completion?.valueKind === "text" && textValuePresent(completion);
}

function autoCompletionComplete(
	completion: FieldCompletion | undefined,
): boolean {
	return completion?.valueKind === "auto" && textValuePresent(completion);
}

const SUBMIT_CHECKS: Record<
	PlacementField["type"],
	(field: PlacementField, completion: FieldCompletion) => boolean
> = {
	signature: (_field, completion) => visualCompletionComplete(completion),
	initial: (_field, completion) => visualCompletionComplete(completion),
	checkbox: (_field, completion) => checkboxCompletionComplete(completion),
	text: (_field, completion) => textCompletionComplete(completion),
	date: (_field, completion) => autoCompletionComplete(completion),
	name: (_field, completion) => autoCompletionComplete(completion),
	email: (_field, completion) => autoCompletionComplete(completion),
};

export function displayModeComplete(
	completion: FieldCompletion | undefined,
): boolean {
	if (!completion) return false;
	if (completion.valueKind === "visual") {
		return visualHasDisplayPreview(completion);
	}
	if (completion.valueKind === "checkbox") return checkboxChecked(completion);
	return textValuePresent(completion);
}

export function draftModeComplete(
	_field: PlacementField,
	completion: FieldCompletion | undefined,
	inCompletedSet: boolean,
): boolean {
	if (!inCompletedSet || !completion) return false;
	if (completion.valueKind === "visual") return visualHasStorage(completion);
	if (completion.valueKind === "checkbox") return checkboxChecked(completion);
	return textValuePresent(completion);
}

export function submitModeComplete(
	field: PlacementField,
	completion: FieldCompletion | undefined,
	inCompletedSet: boolean,
): boolean {
	if (!inCompletedSet || !completion || completion.fieldId !== field.id) {
		return false;
	}
	return SUBMIT_CHECKS[field.type](field, completion);
}

export function lazyProvisionModeComplete(
	field: PlacementField,
	completion: FieldCompletion | undefined,
	inCompletedSet: boolean,
): boolean {
	if (inCompletedSet && completion) {
		return draftModeComplete(field, completion, inCompletedSet);
	}
	if (
		field.required &&
		(field.type === "signature" || field.type === "initial")
	) {
		return true;
	}
	return false;
}
