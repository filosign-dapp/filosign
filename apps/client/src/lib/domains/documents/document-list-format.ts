import type { DocumentListRow } from "@filosign/react/documents";
import { formatDocumentCardDate } from "@/src/lib/domains/documents/document-card";
import { documentRowStatusLabelFromRow } from "@/src/lib/domains/documents/document-row-status";
import { formatFileSize } from "@/src/lib/utils/format-file-size";

export function documentRowTypeLabel(row: DocumentListRow): string {
	if (row.kind === "draft") return "Draft";
	return row.direction === "sent" ? "Sent" : "Received";
}

export function documentRowStatusLabel(row: DocumentListRow): string {
	return documentRowStatusLabelFromRow(row);
}

export function documentRowPartySubtitle(row: DocumentListRow): string | null {
	if (row.kind === "envelope" && row.direction === "received" && row.party) {
		return `From ${row.party.label}`;
	}
	return null;
}

export function documentRowSizeLabel(row: DocumentListRow): string {
	if (row.sizeBytes == null || row.sizeBytes <= 0) return "-";
	return formatFileSize(row.sizeBytes);
}

export function documentRowUpdatedLabel(row: DocumentListRow): string {
	return formatDocumentCardDate(new Date(row.updatedAt));
}

export function documentRowGridSubtitle(row: DocumentListRow): string {
	const party = documentRowPartySubtitle(row);
	const parts = [
		documentRowStatusLabel(row),
		documentRowSizeLabel(row),
		documentRowUpdatedLabel(row),
	];
	const subtitle = parts.join(" · ");
	return party ? `${party} · ${subtitle}` : subtitle;
}
