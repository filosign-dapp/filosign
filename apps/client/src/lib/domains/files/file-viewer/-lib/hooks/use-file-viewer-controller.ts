import { useFilosignContext } from "@filosign/react";
import { useAckFile, useFileInfo } from "@filosign/react/files";
import { useCallback } from "react";
import { useCompliancePdfExports } from "@/src/lib/domains/files/compliance-pdf";
import type { FileViewerFile } from "@/src/lib/domains/files/file-viewer/-lib/types";
import { usePdfDocumentViewer } from "@/src/lib/domains/files/hooks/use-pdf-document-viewer";
import { safeAsync } from "@/src/lib/utils/safe";

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

	const needsAck = Boolean(
		fileInfo?.participantAccess && !fileInfo.participantAccess.canDecrypt,
	);
	const isEnvelopeComplete = Boolean(fileInfo?.envelopeProgress?.completedAt);

	const decrypt = usePdfDocumentViewer({
		file: fileInfo ?? null,
		enabled: viewerOpen && Boolean(fileInfo) && !needsAck,
		acknowledgeHint: !isSender,
		viewSource: "file_viewer",
		initialZoom: 75,
	});

	const acknowledgeFile = useAckFile();
	const handleAcknowledge = useCallback(async () => {
		if (!file?.pieceCid) return;
		await safeAsync(() =>
			acknowledgeFile.mutateAsync({ pieceCid: file.pieceCid }),
		);
	}, [acknowledgeFile, file?.pieceCid]);

	const complianceFileRef = fileInfo ?? file;
	const compliance = useCompliancePdfExports({
		file: complianceFileRef
			? {
					pieceCid: complianceFileRef.pieceCid,
					isFinalized: Boolean(
						fileInfo?.envelopeProgress?.completedAt ||
							fileInfo?.envelopeProgress?.revokedBeforeCompletedAt,
					),
				}
			: null,
		fileData: decrypt.fileData,
		satelliteWorkflowSummary: fileInfo?.satelliteWorkflowSummary,
	});

	return {
		file,
		fileInfo,
		fileLoading,
		isSender,
		needsAck,
		isEnvelopeComplete,
		handleAcknowledge,
		acknowledgePending: acknowledgeFile.isPending,
		...decrypt,
		...compliance,
	};
}

export type FileViewerController = ReturnType<typeof useFileViewerController>;
