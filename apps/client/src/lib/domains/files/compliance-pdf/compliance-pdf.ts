import type { ViewFileResult } from "@filosign/react/files";
import { useComplianceBundle } from "@filosign/react/files";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { defaultChain } from "@/src/constants";

type ComplianceFileRef = {
	pieceCid: string;
	status?: string;
	/** Envelope finalized: fully executed or voided before complete. */
	isFinalized?: boolean;
};

export function useCompliancePdfExports(options: {
	file: ComplianceFileRef | null | undefined;
	fileData: ViewFileResult | null;
}) {
	const { file, fileData } = options;
	const complianceBundle = useComplianceBundle();
	const [pdfExportBusy, setPdfExportBusy] = useState(false);

	const exportsAllowed = Boolean(file?.isFinalized);

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
		if (!file?.pieceCid || !exportsAllowed) return;
		if (!fileData) return;
		setPdfExportBusy(true);
		try {
			const documentSha256 = fileData.registerDocumentSha256;
			const { bundle, bundleHash, exportId } =
				await complianceBundle.mutateAsync({
					pieceCid: file.pieceCid,
					exportKind: "pdf",
					documentSha256,
				});
			const explorerBase = defaultChain.blockExplorers?.default?.url ?? null;
			const { buildCompliancePdfOnly, downloadPdfBytes } = await import(
				"./utils/build"
			);
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
			toast.error("Compliance export failed");
		} finally {
			setPdfExportBusy(false);
		}
	}, [complianceBundle, exportsAllowed, file, fileData]);

	const handleDownloadDocumentWithCompliancePdf = useCallback(async () => {
		if (!file?.pieceCid || !fileData || !exportsAllowed) {
			return;
		}
		setPdfExportBusy(true);
		try {
			const documentSha256 = fileData.registerDocumentSha256;
			const { bundle, bundleHash, exportId } =
				await complianceBundle.mutateAsync({
					pieceCid: file.pieceCid,
					exportKind: "pdf",
					documentSha256,
				});
			const explorerBase = defaultChain.blockExplorers?.default?.url ?? null;
			const { buildDocumentPlusCompliancePdf, downloadPdfBytes } = await import(
				"./utils/build"
			);
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
			toast.error("Compliance export failed");
		} finally {
			setPdfExportBusy(false);
		}
	}, [complianceBundle, exportsAllowed, file, fileData]);

	const handleDownloadCompletionPacket = useCallback(async () => {
		if (!file?.pieceCid || !fileData || !exportsAllowed) return;
		setPdfExportBusy(true);
		try {
			const documentSha256 = fileData.registerDocumentSha256;
			const { bundle, bundleHash, exportId } =
				await complianceBundle.mutateAsync({
					pieceCid: file.pieceCid,
					exportKind: "zip",
					documentSha256,
				});
			const explorerBase = defaultChain.blockExplorers?.default?.url ?? null;
			const { buildCompliancePdfOnly, buildDocumentPlusCompliancePdf } =
				await import("./utils/build");
			const { downloadCompletionPacketZip } = await import(
				"./utils/completion-packet"
			);
			const compliancePdfBytes = await buildCompliancePdfOnly({
				bundle,
				bundleHash,
				exportId,
				chainName: defaultChain.name,
				explorerBaseUrl: explorerBase,
				documentSha256,
				decryptedDocumentMeta: {
					name: fileData.metadata.name,
					mimeType: fileData.metadata.mimeType,
					sizeBytes: fileData.fileBytes.length,
				},
			});
			const mergedPdfBytes = await buildDocumentPlusCompliancePdf({
				bundle,
				bundleHash,
				exportId,
				fileData,
				chainName: defaultChain.name,
				explorerBaseUrl: explorerBase,
				documentSha256,
			});
			await downloadCompletionPacketZip({
				bundle,
				bundleHash,
				exportId,
				fileData,
				compliancePdfBytes,
				mergedPdfBytes,
				chainName: defaultChain.name,
				explorerBaseUrl: explorerBase,
				pieceCid: file.pieceCid,
			});
		} catch (e) {
			console.error(e);
			toast.error("Completion packet export failed");
		} finally {
			setPdfExportBusy(false);
		}
	}, [complianceBundle, exportsAllowed, file, fileData]);

	return {
		complianceBundle,
		pdfExportBusy,
		exportsAllowed,
		handleDownload,
		handleDownloadCompliancePdf,
		handleDownloadDocumentWithCompliancePdf,
		handleDownloadCompletionPacket,
	};
}
