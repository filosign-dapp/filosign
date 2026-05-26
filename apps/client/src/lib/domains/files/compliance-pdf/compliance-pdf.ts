import type { ViewFileResult } from "@filosign/react/files";
import { useComplianceBundle } from "@filosign/react/files";
import { useCallback, useState } from "react";
import { defaultChain } from "@/src/constants";
import {
	buildCompliancePdfOnly,
	buildDocumentPlusCompliancePdf,
	downloadPdfBytes,
	sha256HexOfBytes,
} from "./utils/build";

type ComplianceFileRef = {
	pieceCid: string;
	status?: string;
};

export function useCompliancePdfExports(options: {
	file: ComplianceFileRef | null | undefined;
	fileData: ViewFileResult | null;
}) {
	const { file, fileData } = options;
	const complianceBundle = useComplianceBundle();
	const [pdfExportBusy, setPdfExportBusy] = useState(false);

	const handleDownload = useCallback(() => {
		if (!fileData) return;
		const arrayBuffer = new ArrayBuffer(fileData.fileBytes.length);
		new Uint8Array(arrayBuffer).set(fileData.fileBytes);
		const blob = new Blob([arrayBuffer], {
			type: fileData.metadata.mimeType,
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download =
			fileData.metadata.name ||
			`document-${(file?.pieceCid ?? "unknown").slice(0, 8)}`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}, [fileData, file?.pieceCid]);

	const handleDownloadCompliancePdf = useCallback(async () => {
		if (!file?.pieceCid) return;
		if (!fileData) return;
		setPdfExportBusy(true);
		try {
			const documentSha256 = fileData
				? await sha256HexOfBytes(fileData.fileBytes)
				: undefined;
			const { bundle, bundleHash, exportId } =
				await complianceBundle.mutateAsync({
					pieceCid: file.pieceCid,
					documentSha256,
				});
			const explorerBase = defaultChain.blockExplorers?.default?.url ?? null;
			const bytes = await buildCompliancePdfOnly({
				bundle,
				bundleHash,
				exportId,
				chainName: defaultChain.name,
				explorerBaseUrl: explorerBase,
				documentSha256,
				decryptedDocumentMeta: fileData
					? {
							name: fileData.metadata.name,
							mimeType: fileData.metadata.mimeType,
							sizeBytes: fileData.fileBytes.length,
						}
					: null,
			});
			const safe = file.pieceCid.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48);
			downloadPdfBytes(bytes, `filosign-file-record-${safe}`);
		} catch (e) {
			console.error(e);
		} finally {
			setPdfExportBusy(false);
		}
	}, [complianceBundle, file, fileData]);

	const handleDownloadDocumentWithCompliancePdf = useCallback(async () => {
		if (!file?.pieceCid || !fileData) {
			return;
		}
		setPdfExportBusy(true);
		try {
			const documentSha256 = await sha256HexOfBytes(fileData.fileBytes);
			const { bundle, bundleHash, exportId } =
				await complianceBundle.mutateAsync({
					pieceCid: file.pieceCid,
					documentSha256,
				});
			const explorerBase = defaultChain.blockExplorers?.default?.url ?? null;
			const bytes = await buildDocumentPlusCompliancePdf({
				bundle,
				bundleHash,
				exportId,
				fileData,
				chainName: defaultChain.name,
				explorerBaseUrl: explorerBase,
				documentSha256,
			});
			const safe = file.pieceCid.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48);
			downloadPdfBytes(bytes, `filosign-document-with-record-${safe}`);
		} catch (e) {
			console.error(e);
		} finally {
			setPdfExportBusy(false);
		}
	}, [complianceBundle, file, fileData]);

	return {
		complianceBundle,
		pdfExportBusy,
		handleDownload,
		handleDownloadCompliancePdf,
		handleDownloadDocumentWithCompliancePdf,
	};
}
