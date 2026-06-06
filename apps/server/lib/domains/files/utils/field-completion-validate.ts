import { throwAppError } from "@filosign/errors/server";
import {
	AUTO_FIELD_TYPES,
	CHECKBOX_FIELD_TYPES,
	type FieldCompletion,
	type PlacementField,
	TEXT_FIELD_TYPES,
	VISUAL_FIELD_TYPES,
} from "@filosign/shared";

function validateVisualCompletion(
	_field: PlacementField,
	completion: FieldCompletion,
): void {
	if (completion.valueKind !== "visual" || !completion.storageKey) {
		throw throwAppError("SIGNING.FIELD_VISUAL_REQUIRED");
	}
}

function validateAutoCompletion(
	_field: PlacementField,
	completion: FieldCompletion,
): void {
	if (completion.valueKind !== "auto" || !completion.textValue?.trim()) {
		throw throwAppError("SIGNING.FIELD_AUTO_REQUIRED");
	}
}

function validateTextCompletion(
	_field: PlacementField,
	completion: FieldCompletion,
): void {
	if (completion.valueKind !== "text" || !completion.textValue?.trim()) {
		throw throwAppError("SIGNING.FIELD_TEXT_REQUIRED");
	}
}

function validateCheckboxCompletion(
	_field: PlacementField,
	completion: FieldCompletion,
): void {
	if (completion.valueKind !== "checkbox") {
		throw throwAppError("SIGNING.FIELD_CHECKBOX_REQUIRED");
	}
}

const FIELD_TYPE_VALIDATORS: ReadonlyArray<{
	types: readonly string[];
	validate: (field: PlacementField, completion: FieldCompletion) => void;
}> = [
	{ types: VISUAL_FIELD_TYPES, validate: validateVisualCompletion },
	{ types: AUTO_FIELD_TYPES, validate: validateAutoCompletion },
	{ types: TEXT_FIELD_TYPES, validate: validateTextCompletion },
	{ types: CHECKBOX_FIELD_TYPES, validate: validateCheckboxCompletion },
];

export function validateSingleFieldCompletion(
	field: PlacementField,
	completion: FieldCompletion | undefined,
): void {
	if (!completion || completion.fieldId !== field.id) {
		throw throwAppError("SIGNING.FIELD_COMPLETION_MISSING");
	}

	for (const { types, validate } of FIELD_TYPE_VALIDATORS) {
		if ((types as readonly string[]).includes(field.type)) {
			validate(field, completion);
			return;
		}
	}
}
