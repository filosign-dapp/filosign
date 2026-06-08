import type { ViewFileResult } from "@filosign/react/files";
import { mergeSignablePdfDocuments } from "@/src/lib/domains/files/merge-signable-pdfs";
import { rasterBytesToPdfBytes } from "@/src/lib/domains/files/normalize-signable-document";

export type SignableDocumentSlice = {
	id?: string;
	name: string;
	mimeType: string;
	bytes: Uint8Array;
};

export function signableDocumentsFromView(
	fileData: ViewFileResult,
): SignableDocumentSlice[] {
	return fileData.documents.map((d) => ({
		id: d.id,
		name: d.name,
		mimeType: d.mimeType,
		bytes: d.bytes,
	}));
}

function isPdfLike(doc: SignableDocumentSlice): boolean {
	const name = doc.name.toLowerCase();
	return doc.mimeType === "application/pdf" || name.endsWith(".pdf");
}

function isRasterLike(doc: SignableDocumentSlice): boolean {
	const mime = doc.mimeType.toLowerCase();
	return mime.startsWith("image/");
}

/** PDF bytes for a single document in the sign/compose canvas (images normalized to PDF). */
export async function viewBytesForDocument(
	doc: SignableDocumentSlice,
): Promise<Uint8Array | null> {
	if (isPdfLike(doc)) {
		return doc.bytes.slice();
	}
	if (isRasterLike(doc)) {
		return rasterBytesToPdfBytes(doc.bytes, doc.mimeType);
	}
	return null;
}

/** Merged PDF bytes for preview/export when the envelope has one or more PDF documents. */
export async function mergedPdfBytesForView(
	fileData: ViewFileResult,
): Promise<Uint8Array | null> {
	const docs = signableDocumentsFromView(fileData);
	const normalized: { name: string; bytes: Uint8Array }[] = [];
	for (const doc of docs) {
		const bytes = await viewBytesForDocument(doc);
		if (bytes) {
			normalized.push({ name: doc.name, bytes });
		}
	}
	if (normalized.length === 0) return null;
	if (normalized.length === 1) return normalized[0]?.bytes.slice() ?? null;
	return mergeSignablePdfDocuments(normalized);
}
