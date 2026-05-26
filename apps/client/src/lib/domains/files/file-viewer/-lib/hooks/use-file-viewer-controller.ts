import { useFilosignContext } from "@filosign/react";
import { useFileInfo } from "@filosign/react/files";
import { useCompliancePdfExports } from "@/src/lib/domains/files/compliance-pdf";
import type { FileViewerFile } from "@/src/lib/domains/files/file-viewer/-lib/types";
import { usePdfDocumentViewer } from "@/src/lib/domains/files/hooks/use-pdf-document-viewer";

export function useFileViewerController(
	file: FileViewerFile | null,
	options?: { viewerOpen?: boolean },
) {
	const { wallet } = useFilosignContext();
	const viewerOpen = options?.viewerOpen ?? false;

	const { data: fileInfo, isLoading: fileLoading } = useFileInfo({
		pieceCid: file?.pieceCid,
	});

	const isSender =
		wallet?.account?.address?.toLowerCase() === fileInfo?.sender?.toLowerCase();

	const decrypt = usePdfDocumentViewer({
		file: fileInfo ?? null,
		enabled: viewerOpen && Boolean(fileInfo),
		acknowledgeHint: !isSender,
		initialZoom: 75,
	});

	const compliance = useCompliancePdfExports({
		file: fileInfo ?? file,
		fileData: decrypt.fileData,
	});

	return {
		file,
		fileInfo,
		fileLoading,
		isSender,
		...decrypt,
		...compliance,
	};
}

export type FileViewerController = ReturnType<typeof useFileViewerController>;
