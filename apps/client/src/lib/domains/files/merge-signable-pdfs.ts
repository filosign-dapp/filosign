import { PDFDocument } from "pdf-lib";

/** Convenience export: merged PDF of all signable documents (canonical package remains FileData v2). */
export async function mergeSignablePdfDocuments(
	documents: { name: string; bytes: Uint8Array }[],
): Promise<Uint8Array> {
	const out = await PDFDocument.create();
	for (const doc of documents) {
		const src = await PDFDocument.load(doc.bytes);
		const pages = await out.copyPages(src, src.getPageIndices());
		for (const page of pages) {
			out.addPage(page);
		}
	}
	return out.save();
}
