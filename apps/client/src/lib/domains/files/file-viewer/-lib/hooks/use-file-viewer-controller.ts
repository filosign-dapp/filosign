import { useFilosignContext } from "@filosign/react";
import { useFileInfo } from "@filosign/react/files";
import { useCompliancePdfExports } from "@/src/lib/domains/files/compliance-pdf/use-compliance-pdf-exports";
import type { FileViewerFile } from "@/src/lib/domains/files/file-viewer/-lib/types";
import { useDecryptedFileView } from "@/src/lib/domains/files/hooks/use-decrypted-file-view";
import { usePdfViewport } from "@/src/lib/domains/files/hooks/use-pdf-viewport";

export function useFileViewerController(file: FileViewerFile | null) {
	const { wallet } = useFilosignContext();

	const { data: fileInfo, isLoading: fileLoading } = useFileInfo({
		pieceCid: file?.pieceCid,
	});

	const isSender =
		wallet?.account?.address?.toLowerCase() === fileInfo?.sender?.toLowerCase();

	const decrypt = useDecryptedFileView({
		file: fileInfo ?? null,
		enabled: Boolean(fileInfo),
		acknowledgeHint: !isSender,
	});

	const viewport = usePdfViewport({ initialZoom: 75 });

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
		...viewport,
		...compliance,
	};
}

export type FileViewerController = ReturnType<typeof useFileViewerController>;
