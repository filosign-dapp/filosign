import type { DecryptableFileRecord } from "./use-decrypted-file-view";
import { useDecryptedFileView } from "./use-decrypted-file-view";
import { usePdfViewport } from "./use-pdf-viewport";

type PdfDocumentViewerOptions = {
	file: DecryptableFileRecord | null | undefined;
	enabled?: boolean;
	acknowledgeHint?: boolean;
	initialZoom?: number;
	mobile?: { width: number; height: number };
	desktop?: { width: number; height: number };
};

/** Shared PDF viewport + decrypt orchestration (sign, file-viewer, add-sign). */
export function usePdfDocumentViewer(options: PdfDocumentViewerOptions) {
	const {
		file,
		enabled = true,
		acknowledgeHint = false,
		initialZoom,
		mobile,
		desktop,
	} = options;

	const decrypt = useDecryptedFileView({
		file,
		enabled,
		acknowledgeHint,
	});

	const viewport = usePdfViewport({ initialZoom, mobile, desktop });

	return {
		...decrypt,
		...viewport,
	};
}
