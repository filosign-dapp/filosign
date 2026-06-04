import type { ViewFileResult } from "@filosign/react/files";
import { mergeSignablePdfDocuments } from "@/src/lib/domains/files/merge-signable-pdfs";

export type SignableDocumentSlice = {
	name: string;
	mimeType: string;
	bytes: Uint8Array;
};

export function signableDocumentsFromView(
	fileData: ViewFileResult,
): SignableDocumentSlice[] {
	return fileData.documents.map((d) => ({
		name: d.name,
		mimeType: d.mimeType,
		bytes: d.bytes,
	}));
}

function isPdfLike(doc: SignableDocumentSlice): boolean {
	const name = doc.name.toLowerCase();
	return doc.mimeType === "application/pdf" || name.endsWith(".pdf");
}

/** Merged PDF bytes for preview/export when the envelope has one or more PDF documents. */
export async function mergedPdfBytesForView(
	fileData: ViewFileResult,
): Promise<Uint8Array | null> {
	const pdfDocs = signableDocumentsFromView(fileData).filter(isPdfLike);
	if (pdfDocs.length === 0) return null;
	if (pdfDocs.length === 1) return pdfDocs[0]?.bytes.slice() ?? null;
	return mergeSignablePdfDocuments(
		pdfDocs.map((d) => ({ name: d.name, bytes: d.bytes })),
	);
}
