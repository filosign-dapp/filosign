import { useMemo } from "react";
import {
	DocumentListRail,
	type DocumentListRailItem,
} from "@/src/lib/domains/files/document-viewport";
import { SupplementaryPacketsSidebar } from "@/src/routes/dashboard/envelope/create/add-sign/-components/supplementary-packets-review";
import type {
	Document,
	SignatureField,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";

type DocumentThumbnailsSidebarProps = {
	documents: Document[];
	currentDocumentId: string;
	signatureFields: SignatureField[];
	onDocumentSelect: (documentId: string) => void;
};

export function DocumentThumbnailsSidebar({
	documents,
	currentDocumentId,
	signatureFields,
	onDocumentSelect,
}: DocumentThumbnailsSidebarProps) {
	const railDocuments = useMemo((): DocumentListRailItem[] => {
		const fieldCountByDoc = new Map<string, number>();
		for (const field of signatureFields) {
			fieldCountByDoc.set(
				field.documentId,
				(fieldCountByDoc.get(field.documentId) ?? 0) + 1,
			);
		}
		return documents.map((doc) => ({
			id: doc.id,
			name: doc.name,
			fieldCount: fieldCountByDoc.get(doc.id) ?? 0,
		}));
	}, [documents, signatureFields]);

	return (
		<DocumentListRail
			documents={railDocuments}
			currentDocumentId={currentDocumentId}
			onDocumentSelect={onDocumentSelect}
			borderSide="right"
			renderFooter={() => <SupplementaryPacketsSidebar />}
		/>
	);
}
