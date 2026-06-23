import type { FieldCompletion, PlacementField } from "@filosign/shared";

export function autoFillValue(
	fieldType: PlacementField["type"],
	profile: {
		firstName?: string | null;
		lastName?: string | null;
		email?: string | null;
	},
): string {
	switch (fieldType) {
		case "date":
			return new Date().toLocaleDateString();
		case "name": {
			const name = [profile.firstName, profile.lastName]
				.filter(Boolean)
				.join(" ")
				.trim();
			return name || "Signer";
		}
		case "email":
			return profile.email?.trim() || "";
		default:
			return "";
	}
}

export function buildAutoFieldCompletion(
	field: PlacementField,
	profile:
		| {
				firstName?: string | null;
				lastName?: string | null;
				email?: string | null;
		  }
		| null
		| undefined,
): FieldCompletion | null {
	const textValue = autoFillValue(field.type, {
		firstName: profile?.firstName,
		lastName: profile?.lastName,
		email: profile?.email,
	});
	if (!textValue) return null;
	return {
		fieldId: field.id,
		valueKind: "auto",
		sourceArtifactId: null,
		storageKey: null,
		contentSha256: null,
		textValue,
		previewUrl: null,
	};
}

export function buildCheckboxFieldCompletion(fieldId: string): FieldCompletion {
	return {
		fieldId,
		valueKind: "checkbox",
		sourceArtifactId: null,
		storageKey: null,
		contentSha256: null,
		textValue: "true",
		previewUrl: null,
	};
}

export function buildTextCompletion(
	fieldId: string,
	textValue: string,
): FieldCompletion {
	return {
		fieldId,
		valueKind: "text",
		sourceArtifactId: null,
		storageKey: null,
		contentSha256: null,
		textValue,
		previewUrl: null,
	};
}

export function buildCheckboxCompletion(
	fieldId: string,
	current?: FieldCompletion,
): FieldCompletion {
	const checked = current?.textValue === "true";
	return {
		fieldId,
		valueKind: "checkbox",
		sourceArtifactId: null,
		storageKey: null,
		contentSha256: null,
		textValue: checked ? "false" : "true",
		previewUrl: null,
	};
}
