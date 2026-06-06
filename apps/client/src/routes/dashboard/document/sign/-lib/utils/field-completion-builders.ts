import type { FieldCompletion, PlacementField } from "@filosign/shared";
import { buildVisualCompletionFromArtifact } from "@filosign/shared";

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

export function buildSyncFieldCompletion(
	field: PlacementField,
	defaultArtifacts: {
		signature: {
			id: string;
			storageKey: string;
			contentSha256: string;
			previewUrl: string | null;
		} | null;
		initial: {
			id: string;
			storageKey: string;
			contentSha256: string;
			previewUrl: string | null;
		} | null;
	},
	profile:
		| {
				firstName?: string | null;
				lastName?: string | null;
				email?: string | null;
		  }
		| null
		| undefined,
): FieldCompletion | null {
	if (field.type === "signature" && defaultArtifacts.signature) {
		return buildVisualCompletionFromArtifact(field, defaultArtifacts.signature);
	}
	if (field.type === "initial" && defaultArtifacts.initial) {
		return buildVisualCompletionFromArtifact(field, defaultArtifacts.initial);
	}
	if (
		field.type === "date" ||
		field.type === "name" ||
		field.type === "email"
	) {
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
	if (field.type === "checkbox") {
		return {
			fieldId: field.id,
			valueKind: "checkbox",
			sourceArtifactId: null,
			storageKey: null,
			contentSha256: null,
			textValue: "true",
			previewUrl: null,
		};
	}
	return null;
}
