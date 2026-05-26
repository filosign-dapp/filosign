import {
	formatDocumentCardDate,
	formatFileSubtitle,
} from "@/src/lib/domains/documents/document-card";

export type FileRow = {
	pieceCid: string;
	displayName?: string | null;
	mimeType?: string | null;
	ciphertextByteLength?: number | null;
	metadata?: {
		fileName?: string;
		fileSize?: number;
	};
	createdAt?: Date;
	[key: string]: unknown;
};

export function mapFileToDocumentCardProps(file: FileRow) {
	const title =
		file.displayName?.trim() || file.metadata?.fileName || "Unknown File";
	const sizeBytes = file.ciphertextByteLength ?? file.metadata?.fileSize ?? 0;
	const date = file.createdAt ? new Date(file.createdAt) : new Date();
	return {
		title,
		subtitle: formatFileSubtitle({ sizeBytes, date }),
	};
}

export { formatDocumentCardDate };
