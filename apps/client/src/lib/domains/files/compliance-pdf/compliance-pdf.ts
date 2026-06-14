import { useFilosignContext } from "@filosign/react";
import { getSessionSeed } from "@filosign/react/auth";
import type { ViewFileResult } from "@filosign/react/files";
import { useComplianceBundle } from "@filosign/react/files";
import { useUserProfile } from "@filosign/react/users";
import { useCallback, useState } from "react";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { complianceExportContext } from "./utils/export-context";
import { safePieceCidDownloadBasename } from "./utils/zip-entries";

type ComplianceFileRef = {
	pieceCid: string;
	status?: string;
	/** Envelope finalized: fully executed or voided before complete. */
	isFinalized?: boolean;
};

export type ProofDownloadExports = Pick<
	ReturnType<typeof useCompliancePdfExports>,
	| "exportsAllowed"
	| "pdfExportBusy"
	| "handleDownloadOriginalFiles"
	| "handleDownloadSignedEnvelope"
	| "handleDownloadCompletionPacket"
	| "handleDownloadCompliancePdf"
>;

export function useCompliancePdfExports(options: {
	file: ComplianceFileRef | null | undefined;
	fileData: ViewFileResult | null;
}) {
	const { file, fileData } = options;
	const { rpcQuery, wallet } = useFilosignContext();
	const { data: userProfile } = useUserProfile();
	const complianceBundle = useComplianceBundle();
	const [pdfExportBusy, setPdfExportBusy] = useState(false);

	const exportsAllowed = Boolean(file?.isFinalized);

	const handleDownloadOriginalFiles = useCallback(async () => {
		if (!fileData) return;
		const { downloadOriginalFilesZip } = await import(
			"./utils/envelope-downloads"
		);
		downloadOriginalFilesZip({
			fileData,
			pieceCid: file?.pieceCid ?? "unknown",
		});
	}, [fileData, file?.pieceCid]);

	const fetchComplianceBundle = useCallback(
		async (exportKind: "pdf" | "zip") => {
			if (!file?.pieceCid || !fileData) {
				throw new Error("File data is not ready");
			}
			return complianceBundle.mutateAsync({
				pieceCid: file.pieceCid,
				exportKind,
				documentSha256: fileData.registerDocumentSha256,
			});
		},
		[complianceBundle, file?.pieceCid, fileData],
	);

	const handleDownloadCompliancePdf = useCallback(async () => {
		if (!file?.pieceCid || !exportsAllowed || !fileData) return;
		setPdfExportBusy(true);
		try {
			const exportCtx = complianceExportContext(fileData);
			const { bundle, bundleHash, exportId } =
				await fetchComplianceBundle("pdf");
			const { buildCompliancePdfOnly, downloadPdfBytes } = await import(
				"./utils/build"
			);
			const bytes = await buildCompliancePdfOnly({
				bundle,
				bundleHash,
				exportId,
				...exportCtx,
			});
			downloadPdfBytes(
				bytes,
				`filosign-completion-certificate-${safePieceCidDownloadBasename(file.pieceCid)}`,
			);
		} catch (e) {
			console.error(e);
			toastUser.error(TOASTS.exports.certificateFailed.title, {
				hint: TOASTS.exports.certificateFailed.hint,
			});
		} finally {
			setPdfExportBusy(false);
		}
	}, [exportsAllowed, fetchComplianceBundle, file, fileData]);

	const handleDownloadSignedEnvelope = useCallback(async () => {
		if (!file?.pieceCid || !fileData || !exportsAllowed) return;
		setPdfExportBusy(true);
		try {
			const { bundle } = await fetchComplianceBundle("pdf");
			const { downloadSignedEnvelopeZip } = await import(
				"./utils/envelope-downloads"
			);
			await downloadSignedEnvelopeZip({
				fileData,
				bundle,
				pieceCid: file.pieceCid,
			});
		} catch (e) {
			console.error(e);
			toastUser.error(TOASTS.exports.signedDocumentFailed.title, {
				hint: TOASTS.exports.signedDocumentFailed.hint,
			});
		} finally {
			setPdfExportBusy(false);
		}
	}, [exportsAllowed, fetchComplianceBundle, file, fileData]);

	const handleDownloadCompletionPacket = useCallback(async () => {
		if (!file?.pieceCid || !fileData || !exportsAllowed) return;
		setPdfExportBusy(true);
		try {
			const exportCtx = complianceExportContext(fileData);
			const { bundle, bundleHash, exportId } =
				await fetchComplianceBundle("zip");
			const { buildCompliancePdfOnly, buildDocumentPlusCompliancePdf } =
				await import("./utils/build");
			const { downloadCompletionPacketZip } = await import(
				"./utils/completion-packet"
			);
			const compliancePdfBytes = await buildCompliancePdfOnly({
				bundle,
				bundleHash,
				exportId,
				...exportCtx,
			});
			const mergedPdfBytes = await buildDocumentPlusCompliancePdf({
				bundle,
				bundleHash,
				exportId,
				fileData,
				...exportCtx,
			});
			const keySeed = wallet ? getSessionSeed(wallet.account.address) : null;
			const userEmail = userProfile?.email?.trim() ?? null;

			await downloadCompletionPacketZip({
				bundle,
				bundleHash,
				exportId,
				fileData,
				compliancePdfBytes,
				mergedPdfBytes,
				chainName: exportCtx.chainName,
				explorerBaseUrl: exportCtx.explorerBaseUrl,
				verifyWebUrl: exportCtx.verifyWebUrl,
				pieceCid: file.pieceCid,
				rpcQuery,
				keySeed,
				userEmail,
			});
		} catch (e) {
			console.error(e);
			toastUser.error(TOASTS.exports.proofDownloadFailed.title, {
				hint: TOASTS.exports.proofDownloadFailed.hint,
			});
		} finally {
			setPdfExportBusy(false);
		}
	}, [
		exportsAllowed,
		fetchComplianceBundle,
		file,
		fileData,
		rpcQuery,
		userProfile?.email,
		wallet,
	]);

	return {
		complianceBundle,
		pdfExportBusy,
		exportsAllowed,
		handleDownloadOriginalFiles,
		handleDownloadCompliancePdf,
		handleDownloadSignedEnvelope,
		handleDownloadCompletionPacket,
	};
}
