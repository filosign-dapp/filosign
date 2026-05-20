import type { ComplianceBundle } from "@filosign/shared";

export type PlacementSignerRow = Pick<
	ComplianceBundle["signers"][number],
	"email" | "signed" | "completedFieldIds" | "draftCompletedFieldIds"
>;

/** First row per normalized recipient email (matches prior `find` semantics). */
export function signersByNormalizedRecipientEmail(
	signers: ComplianceBundle["signers"],
): Map<string, ComplianceBundle["signers"][number]> {
	const m = new Map<string, ComplianceBundle["signers"][number]>();
	for (const s of signers) {
		const k = s.email?.trim().toLowerCase();
		if (k && !m.has(k)) m.set(k, s);
	}
	return m;
}

export function fieldPlacementStatusFromSignerRow(
	row: PlacementSignerRow | undefined,
	fieldId: string,
): "signed" | "draft" | "pending" {
	if (!row) return "pending";
	if (row.signed && row.completedFieldIds.includes(fieldId)) return "signed";
	if (row.draftCompletedFieldIds.includes(fieldId)) return "draft";
	return "pending";
}
