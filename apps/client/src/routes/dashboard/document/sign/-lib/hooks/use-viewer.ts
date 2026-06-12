import type { ViewFileResult } from "@filosign/react/files";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	usePageLayout,
	useViewportDimensions,
	type ViewportDocument,
} from "@/src/lib/domains/files/document-viewport";
import { useDecryptedFileView } from "@/src/lib/domains/files/hooks/use-decrypted-file-view";
import { PLACEMENT_VIEWPORT_WIDTH } from "@/src/lib/domains/files/placement-viewport";
import {
	signableDocumentsFromView,
	viewBytesForDocument,
} from "@/src/lib/domains/files/signable-documents";

type SignFileRecord = {
	pieceCid: string;
	status?: string;
	kemCiphertext?: string | null;
	encryptedEncryptionKey?: string | null;
	organizationId?: string | null;
	orgKemCiphertext?: string | null;
	orgEncryptedEncryptionKey?: string | null;
};

function documentBytesKey(doc: { id?: string; name: string }) {
	return doc.id ?? doc.name;
}

export function useSignViewer(file: SignFileRecord | undefined) {
	const { height: fallbackPageHeight, isMobile } = useViewportDimensions();
	const decrypt = useDecryptedFileView({
		file: file ?? null,
		enabled: Boolean(file),
		acknowledgeHint: true,
	});
	const {
		recordPdfPageLayout,
		getPageHeight,
		setPdfNumPages,
		pdfNumPages,
		resetPageLayout,
	} = usePageLayout(fallbackPageHeight);
	const [currentDocumentId, setCurrentDocumentId] = useState("");
	const [documentPdfBytes, setDocumentPdfBytes] = useState<
		Map<string, Uint8Array>
	>(new Map());
	const [fieldFocusRequestId, setFieldFocusRequestId] = useState<string | null>(
		null,
	);

	const fileData = decrypt.fileData as ViewFileResult | null;

	const documents = useMemo((): ViewportDocument[] => {
		if (!fileData) return [];
		return fileData.documents.map((doc) => ({
			id: doc.id,
			name: doc.name,
			mimeType: doc.mimeType,
			pdfBytes: documentPdfBytes.get(documentBytesKey(doc)),
			pages: 1,
		}));
	}, [fileData, documentPdfBytes]);

	const currentDocument = useMemo(
		() => documents.find((d) => d.id === currentDocumentId) ?? documents[0],
		[documents, currentDocumentId],
	);

	useEffect(() => {
		if (!fileData) {
			setDocumentPdfBytes(new Map());
			setCurrentDocumentId("");
			resetPageLayout();
			return;
		}
		let cancelled = false;
		void (async () => {
			const map = new Map<string, Uint8Array>();
			for (const doc of signableDocumentsFromView(fileData)) {
				const bytes = await viewBytesForDocument(doc);
				if (bytes) {
					map.set(documentBytesKey(doc), bytes);
				}
			}
			if (!cancelled) {
				setDocumentPdfBytes(map);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [fileData, resetPageLayout]);

	useEffect(() => {
		if (documents.length > 0 && !currentDocumentId) {
			const firstDoc = documents[0];
			if (firstDoc) {
				setCurrentDocumentId(firstDoc.id);
			}
		}
	}, [documents, currentDocumentId]);

	useEffect(() => {
		resetPageLayout();
	}, [currentDocumentId, resetPageLayout]);

	const requestFieldFocus = useCallback((fieldId: string) => {
		setFieldFocusRequestId(fieldId);
	}, []);

	const clearFieldFocusRequest = useCallback(() => {
		setFieldFocusRequestId(null);
	}, []);

	const isPdfDocument = Boolean(currentDocument?.pdfBytes);

	return {
		fileData,
		viewError: decrypt.viewError,
		viewFile: decrypt.viewFile,
		handleViewFile: decrypt.handleViewFile,
		docCanvasBusy: decrypt.docCanvasBusy,
		showRecoveryInCanvas: decrypt.showRecoveryInCanvas,
		recoveryPhrase: decrypt.recoveryPhrase,
		setRecoveryPhrase: decrypt.setRecoveryPhrase,
		recoveryError: decrypt.recoveryError,
		submitRecovery: decrypt.submitRecovery,
		recoveryPending: decrypt.recoveryPending,
		cryptoUnlockError: decrypt.cryptoUnlockError,
		retryWalletUnlock: decrypt.retryWalletUnlock,
		tryingWalletUnlock: decrypt.tryingWalletUnlock,
		currentDocumentId,
		setCurrentDocumentId,
		currentDocument,
		documents,
		documentWidth: PLACEMENT_VIEWPORT_WIDTH,
		isMobile,
		isPdfDocument,
		signPdfNumPages: pdfNumPages,
		setSignPdfNumPages: setPdfNumPages,
		recordPdfPageLayout,
		getPageHeight,
		fieldFocusRequestId,
		requestFieldFocus,
		clearFieldFocusRequest,
	};
}

export type SignViewerState = ReturnType<typeof useSignViewer>;
