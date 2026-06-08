export type ViewportDocument = {
	id: string;
	name: string;
	mimeType: string;
	url?: string;
	pdfBytes?: Uint8Array;
	pages?: number;
};
