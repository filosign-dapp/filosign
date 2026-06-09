import { useMemo } from "react";
import {
	DocumentListRail,
	type DocumentListRailItem,
} from "@/src/lib/domains/files/document-viewport";
import {
	useDraftReviewMeta,
	useDraftReviewViewerSlice,
} from "@/src/routes/draft/review/-lib/context/context";
import { fieldCountByDocumentId } from "@/src/routes/draft/review/-lib/utils/snapshot-to-viewport";

export function DraftDocumentsRail() {
	const {
		documents,
		currentDocumentId,
		setCurrentDocumentId,
		placementFields,
	} = useDraftReviewViewerSlice();
	const { isUnlocked } = useDraftReviewMeta();

	const fieldCounts = useMemo(
		() => fieldCountByDocumentId(placementFields),
		[placementFields],
	);

	const railDocuments = useMemo((): DocumentListRailItem[] => {
		return documents.map((doc) => {
			const count = fieldCounts.get(doc.id) ?? 0;
			return {
				id: doc.id,
				name: doc.name,
				fieldCount: count,
			};
		});
	}, [documents, fieldCounts]);

	if (!isUnlocked || documents.length <= 1) {
		return null;
	}

	return (
		<DocumentListRail
			documents={railDocuments}
			currentDocumentId={currentDocumentId}
			onDocumentSelect={setCurrentDocumentId}
			borderSide="left"
		/>
	);
}
