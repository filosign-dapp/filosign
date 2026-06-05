import { useUserProfile, useUserSignatures } from "@filosign/react/users";
import type {
	FieldCompletion,
	FieldCompletionMap,
	PlacementField,
} from "@filosign/shared";
import { useCallback, useMemo } from "react";

function autoFillValue(
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

export function useSignFieldCompletions(options: {
	myPlacementFields: PlacementField[];
}) {
	void options;
	const { data: profile } = useUserProfile();
	const { data: signaturesData } = useUserSignatures();

	const defaultArtifacts = useMemo(() => {
		const signatures = signaturesData?.signatures ?? [];
		const sigId = profile?.defaultSignatureId;
		const initId = profile?.defaultInitialId;
		return {
			signature: signatures.find((s) => s.id === sigId) ?? null,
			initial: signatures.find((s) => s.id === initId) ?? null,
		};
	}, [
		signaturesData?.signatures,
		profile?.defaultSignatureId,
		profile?.defaultInitialId,
	]);

	const buildVisualCompletion = useCallback(
		(
			field: PlacementField,
			artifact: NonNullable<
				typeof defaultArtifacts.signature | typeof defaultArtifacts.initial
			>,
		): FieldCompletion => ({
			fieldId: field.id,
			valueKind: "visual",
			sourceArtifactId: artifact.id,
			storageKey: artifact.storageKey,
			contentSha256: artifact.contentSha256,
			textValue: null,
			previewUrl: artifact.previewUrl,
		}),
		[],
	);

	const applyFieldCompletion = useCallback(
		(field: PlacementField): FieldCompletion | null => {
			if (field.type === "signature" && defaultArtifacts.signature) {
				return buildVisualCompletion(field, defaultArtifacts.signature);
			}
			if (field.type === "initial" && defaultArtifacts.initial) {
				return buildVisualCompletion(field, defaultArtifacts.initial);
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
		},
		[buildVisualCompletion, defaultArtifacts, profile],
	);

	const setTextCompletion = useCallback(
		(fieldId: string, textValue: string): FieldCompletion => ({
			fieldId,
			valueKind: "text",
			sourceArtifactId: null,
			storageKey: null,
			contentSha256: null,
			textValue,
			previewUrl: null,
		}),
		[],
	);

	const toggleCheckboxCompletion = useCallback(
		(fieldId: string, current?: FieldCompletion): FieldCompletion => {
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
		},
		[],
	);

	const fieldHasCompletion = useCallback(
		(field: PlacementField, completions: FieldCompletionMap) => {
			const c = completions[field.id];
			if (!c) return false;
			if (c.valueKind === "visual")
				return Boolean(c.previewUrl || c.storageKey);
			if (c.valueKind === "checkbox") return c.textValue === "true";
			return Boolean(c.textValue?.trim());
		},
		[],
	);

	return {
		defaultArtifacts,
		applyFieldCompletion,
		setTextCompletion,
		toggleCheckboxCompletion,
		fieldHasCompletion,
	};
}
