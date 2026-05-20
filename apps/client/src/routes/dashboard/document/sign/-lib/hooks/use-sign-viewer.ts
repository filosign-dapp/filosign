import type { ViewFileResult } from "@filosign/react/files";
import { useEffect, useRef, useState } from "react";
import { usePdfDocumentViewer } from "@/src/lib/domains/files/hooks/use-pdf-document-viewer";

type SignFileRecord = {
	pieceCid: string;
	status?: string;
	kemCiphertext?: string | null;
	encryptedEncryptionKey?: string | null;
	organizationId?: string | null;
	orgKemCiphertext?: string | null;
	orgEncryptedEncryptionKey?: string | null;
};

export function useSignViewer(
	file: SignFileRecord | undefined,
	pieceCid: string | undefined,
) {
	const decrypt = usePdfDocumentViewer({
		file: file ?? null,
		enabled: Boolean(file),
		acknowledgeHint: true,
		initialZoom: 100,
	});
	const [signPdfPage, setSignPdfPage] = useState(1);
	const [signPdfNumPages, setSignPdfNumPages] = useState<number | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const documentRef = useRef<HTMLDivElement>(null);

	const isSigningPdf = Boolean(decrypt.previewPdfBytes);

	useEffect(() => {
		setSignPdfPage(1);
		setSignPdfNumPages(null);
	}, [pieceCid, decrypt.previewPdfBytes]);

	return {
		fileData: decrypt.fileData as ViewFileResult | null,
		viewError: decrypt.viewError,
		viewFile: decrypt.viewFile,
		handleViewFile: decrypt.handleViewFile,
		previewPdfBytes: decrypt.previewPdfBytes,
		zoom: decrypt.zoom,
		setZoom: decrypt.setZoom,
		documentDimensions: decrypt.documentDimensions,
		handleZoomIn: decrypt.handleZoomIn,
		handleZoomOut: decrypt.handleZoomOut,
		signPdfPage,
		setSignPdfPage,
		signPdfNumPages,
		setSignPdfNumPages,
		isSigningPdf,
		containerRef,
		documentRef,
	};
}
