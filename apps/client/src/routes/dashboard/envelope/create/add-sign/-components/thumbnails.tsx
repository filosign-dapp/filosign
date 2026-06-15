import { useMemo } from "react";
import {
	DocumentListRail,
	type DocumentListRailItem,
} from "@/src/lib/domains/files/document-viewport";
import type {
	PlacementDocument,
	SignatureField,
} from "@/src/lib/domains/placement/types";
import { SupplementaryPacketsSidebar } from "@/src/routes/dashboard/envelope/create/add-sign/-components/supplementary-packets-review";

type DocumentThumbnailsSidebarProps = {
	documents: PlacementDocument[];
	currentDocumentId: string;
	signatureFields: SignatureField[];
	onDocumentSelect: (documentId: string) => void;
	showSupplementaryPackets?: boolean;
};

export function DocumentThumbnailsSidebar({
	documents,
	currentDocumentId,
	signatureFields,
	onDocumentSelect,
	showSupplementaryPackets = true,
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
			renderFooter={() =>
				showSupplementaryPackets ? <SupplementaryPacketsSidebar /> : null
			}
		/>
	);
}
