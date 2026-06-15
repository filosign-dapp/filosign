import { normalizePlacementRecipientEmail } from "@filosign/shared";
import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";
import type { ActiveAssignee } from "@/src/lib/domains/placement/utils/active-assignees";

export function sortPlacedFields(fields: SignatureField[]): SignatureField[] {
	return [...fields].sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x);
}

export function filterPlacedFieldsByAssignee(
	fields: SignatureField[],
	assignee: ActiveAssignee | null,
): SignatureField[] {
	if (!assignee) return fields;
	const email = normalizePlacementRecipientEmail(assignee.email);
	return fields.filter(
		(field) =>
			normalizePlacementRecipientEmail(field.assignedSignerEmail) === email,
	);
}

export type PlacedFieldsPageGroup = {
	page: number;
	fields: SignatureField[];
};

export function groupPlacedFieldsByPage(
	fields: SignatureField[],
): PlacedFieldsPageGroup[] {
	const sorted = sortPlacedFields(fields);
	const groups: PlacedFieldsPageGroup[] = [];

	for (const field of sorted) {
		const last = groups[groups.length - 1];
		if (last?.page === field.page) {
			last.fields.push(field);
		} else {
			groups.push({ page: field.page, fields: [field] });
		}
	}

	return groups;
}
