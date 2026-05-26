export function isPdfDocument(meta: {
	type?: string;
	name?: string;
	pdfBytes?: Uint8Array;
}): boolean {
	if (meta.pdfBytes) return true;
	if (meta.type === "application/pdf") return true;
	return meta.name?.toLowerCase().endsWith(".pdf") ?? false;
}
