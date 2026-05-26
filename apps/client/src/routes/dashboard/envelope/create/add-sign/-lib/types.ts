export type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";

export type Document = {
	id: string;
	name: string;
	mimeType: string;
	url: string;
	pdfBytes?: Uint8Array;
	pages: number;
};
