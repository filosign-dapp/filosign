import type { ViewFileResult } from "@filosign/react/files";
import { useEffect, useRef, useState } from "react";
import { useDecryptedFileView } from "@/src/lib/domains/files/hooks/use-decrypted-file-view";
import { usePdfViewport } from "@/src/lib/domains/files/hooks/use-pdf-viewport";

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
	const decrypt = useDecryptedFileView({
		file: file ?? null,
		enabled: Boolean(file),
		acknowledgeHint: true,
	});

	const viewport = usePdfViewport({ initialZoom: 100 });
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
		...viewport,
		signPdfPage,
		setSignPdfPage,
		signPdfNumPages,
		setSignPdfNumPages,
		isSigningPdf,
		containerRef,
		documentRef,
	};
}
