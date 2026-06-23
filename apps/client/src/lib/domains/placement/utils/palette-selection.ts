import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";

export function resolvePaletteHighlightedFieldType(
	selectedFieldIds: Set<string>,
	signatureFields: SignatureField[],
): SignatureField["type"] | null {
	if (selectedFieldIds.size === 0) return null;

	const selectedTypes = [...selectedFieldIds]
		.map((id) => signatureFields.find((field) => field.id === id)?.type)
		.filter((type): type is SignatureField["type"] => type != null);

	if (selectedTypes.length === 0) return null;

	const firstType = selectedTypes[0];
	if (selectedTypes.every((type) => type === firstType)) {
		return firstType;
	}

	return null;
}
