import {
	formatDocumentCardDate,
	formatFileSubtitle,
} from "@/src/lib/domains/documents/document-card";

export type FileRow = {
	pieceCid: string;
	displayName?: string | null;
	mimeType?: string | null;
	ciphertextByteLength?: number | null;
	createdAt?: Date;
	[key: string]: unknown;
};

export function mapFileToDocumentCardProps(file: FileRow) {
	const title = file.displayName?.trim() || "Unknown File";
	const sizeBytes = file.ciphertextByteLength ?? 0;
	const date = file.createdAt ? new Date(file.createdAt) : new Date();
	return {
		title,
		subtitle: formatFileSubtitle({ sizeBytes, date }),
	};
}

export { formatDocumentCardDate };
