import type { PlacementField } from "@filosign/shared";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";
import {
	type PlacementViewport,
	pxRectToNormalized,
} from "@/src/lib/domains/files/placement-viewport";

export function signatureFieldToPlacementField(
	field: SignatureField,
	viewport: PlacementViewport,
): PlacementField {
	return {
		id: field.id,
		documentId: field.documentId,
		pageIndex: Math.max(0, field.page - 1),
		rect: pxRectToNormalized(
			{
				x: field.x,
				y: field.y,
				width: field.width,
				height: field.height,
			},
			viewport,
		),
		assignedRecipientEmail: normalizePlacementRecipientEmail(
			field.assignedSignerEmail,
		),
		required: field.required,
		type: field.type,
	};
}

export function signatureFieldsToPlacementFields(
	fields: SignatureField[],
	resolveViewport: (field: SignatureField) => PlacementViewport,
): PlacementField[] {
	return fields.map((field) =>
		signatureFieldToPlacementField(field, resolveViewport(field)),
	);
}
