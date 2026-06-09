import type { DraftSnapshot, PlacementField } from "@filosign/shared";
import { zDraftPlacementManifest } from "@filosign/shared";
import type { ViewportDocument } from "@/src/lib/domains/files/document-viewport";
import { viewBytesForDocument } from "@/src/lib/domains/files/signable-documents";

export type DecryptedDraftDocument = {
	id: string;
	name: string;
	type: string;
	bytes: Uint8Array;
};

export function placementFieldsFromSnapshot(
	snapshot: DraftSnapshot,
): PlacementField[] {
	const parsed = zDraftPlacementManifest.safeParse(snapshot.placementManifest);
	if (!parsed.success) return [];
	return parsed.data.fields;
}

export function fieldCountByDocumentId(
	fields: PlacementField[],
): Map<string, number> {
	const counts = new Map<string, number>();
	for (const field of fields) {
		counts.set(field.documentId, (counts.get(field.documentId) ?? 0) + 1);
	}
	return counts;
}

export function fieldCountsBySigner(
	fields: PlacementField[],
): Map<string, number> {
	const counts = new Map<string, number>();
	for (const field of fields) {
		const email = field.assignedRecipientEmail.trim().toLowerCase();
		counts.set(email, (counts.get(email) ?? 0) + 1);
	}
	return counts;
}

export async function decryptedDocumentsToViewport(
	documents: DecryptedDraftDocument[],
): Promise<ViewportDocument[]> {
	const result: ViewportDocument[] = [];
	for (const doc of documents) {
		const mimeType = doc.type;
		const pdfBytes = await viewBytesForDocument({
			id: doc.id,
			name: doc.name,
			mimeType,
			bytes: doc.bytes,
		});
		result.push({
			id: doc.id,
			name: doc.name,
			mimeType,
			pdfBytes: pdfBytes ?? undefined,
			pages: 1,
		});
	}
	return result;
}
