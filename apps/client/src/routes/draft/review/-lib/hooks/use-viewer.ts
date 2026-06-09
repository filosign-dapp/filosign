import type { DraftSnapshot } from "@filosign/shared";
import { useEffect, useMemo, useState } from "react";
import {
	usePageLayout,
	useViewportDimensions,
	type ViewportDocument,
} from "@/src/lib/domains/files/document-viewport";
import { PLACEMENT_VIEWPORT_WIDTH } from "@/src/lib/domains/files/placement-viewport";
import {
	type DecryptedDraftDocument,
	decryptedDocumentsToViewport,
	placementFieldsFromSnapshot,
} from "@/src/routes/draft/review/-lib/utils/snapshot-to-viewport";

export function useDraftReviewViewer(
	decryptedDocuments: DecryptedDraftDocument[] | null,
	snapshot: DraftSnapshot | null,
) {
	const { height: fallbackPageHeight, isMobile } = useViewportDimensions();
	const {
		recordPdfPageLayout,
		getPageHeight,
		setPdfNumPages,
		pdfNumPages,
		resetPageLayout,
	} = usePageLayout(fallbackPageHeight);
	const [currentDocumentId, setCurrentDocumentId] = useState("");
	const [documents, setDocuments] = useState<ViewportDocument[]>([]);
	const [viewportBusy, setViewportBusy] = useState(false);

	const placementFields = useMemo(
		() => (snapshot ? placementFieldsFromSnapshot(snapshot) : []),
		[snapshot],
	);

	useEffect(() => {
		if (!decryptedDocuments?.length) {
			setDocuments([]);
			setCurrentDocumentId("");
			resetPageLayout();
			return;
		}
		let cancelled = false;
		setViewportBusy(true);
		void decryptedDocumentsToViewport(decryptedDocuments).then((mapped) => {
			if (!cancelled) {
				setDocuments(mapped);
				setViewportBusy(false);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [decryptedDocuments, resetPageLayout]);

	useEffect(() => {
		if (documents.length > 0 && !currentDocumentId) {
			const first = documents[0];
			if (first) setCurrentDocumentId(first.id);
		}
	}, [documents, currentDocumentId]);

	useEffect(() => {
		resetPageLayout();
	}, [currentDocumentId, resetPageLayout]);

	const currentDocument = useMemo(
		() => documents.find((d) => d.id === currentDocumentId) ?? documents[0],
		[documents, currentDocumentId],
	);

	const isPdfDocument = Boolean(currentDocument?.pdfBytes);

	return {
		documents,
		currentDocumentId,
		setCurrentDocumentId,
		currentDocument,
		placementFields,
		documentWidth: PLACEMENT_VIEWPORT_WIDTH,
		isMobile,
		isPdfDocument,
		pdfNumPages,
		setPdfNumPages,
		recordPdfPageLayout,
		getPageHeight,
		viewportBusy,
	};
}

export type DraftReviewViewerState = ReturnType<typeof useDraftReviewViewer>;
