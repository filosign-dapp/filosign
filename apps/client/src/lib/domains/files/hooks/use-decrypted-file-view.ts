import { useViewFile, type ViewFileResult } from "@filosign/react/files";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export type DecryptableFileRecord = {
	pieceCid: string;
	status?: string;
	kemCiphertext?: string | null;
	encryptedEncryptionKey?: string | null;
	organizationId?: string | null;
	orgKemCiphertext?: string | null;
	orgEncryptedEncryptionKey?: string | null;
};

function hasDecryptKeys(file: DecryptableFileRecord | null | undefined) {
	if (!file) return false;
	const participant =
		Boolean(file.kemCiphertext) && Boolean(file.encryptedEncryptionKey);
	const orgVault =
		Boolean(file.organizationId) &&
		Boolean(file.orgKemCiphertext) &&
		Boolean(file.orgEncryptedEncryptionKey);
	return participant || orgVault;
}

export function useDecryptedFileView(options: {
	file: DecryptableFileRecord | null | undefined;
	enabled?: boolean;
	acknowledgeHint?: boolean;
}) {
	const { file, enabled = true, acknowledgeHint = false } = options;
	const viewFile = useViewFile();
	const [fileData, setFileData] = useState<ViewFileResult | null>(null);
	const [viewError, setViewError] = useState<string | null>(null);

	const canDecrypt = hasDecryptKeys(file);

	const handleViewFile = useCallback(async () => {
		if (!file || !canDecrypt) {
			setViewError(
				acknowledgeHint
					? "Missing decryption keys. Acknowledge the file first, or ask an admin for your organization key."
					: "File information not available",
			);
			return;
		}

		try {
			setViewError(null);
			const status = (file.status ?? "foc") as "s3" | "foc";
			let result: ViewFileResult | undefined;

			if (file.kemCiphertext && file.encryptedEncryptionKey) {
				result = await viewFile.mutateAsync({
					pieceCid: file.pieceCid,
					kemCiphertext: file.kemCiphertext,
					encryptedEncryptionKey: file.encryptedEncryptionKey,
					status,
				});
			} else if (
				file.organizationId &&
				file.orgKemCiphertext &&
				file.orgEncryptedEncryptionKey
			) {
				result = await viewFile.mutateAsync({
					variant: "org",
					pieceCid: file.pieceCid,
					organizationId: file.organizationId,
					orgKemCiphertext: file.orgKemCiphertext,
					orgEncryptedEncryptionKey: file.orgEncryptedEncryptionKey,
					status,
				});
			}

			if (result) {
				setFileData({
					...result,
					metadata: {
						name: result.metadata.name,
						mimeType: result.metadata.mimeType ?? "application/octet-stream",
					},
				});
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Failed to load file for viewing";
			setViewError(errorMessage);
			toast.error(errorMessage);
		}
	}, [file, canDecrypt, viewFile, acknowledgeHint]);

	useEffect(() => {
		setFileData(null);
		setViewError(null);
	}, [file?.pieceCid]);

	useEffect(() => {
		if (!enabled || !file || !canDecrypt || fileData || viewFile.isPending)
			return;
		void handleViewFile();
	}, [enabled, file, canDecrypt, fileData, viewFile.isPending, handleViewFile]);

	const previewPdfBytes = useMemo(() => {
		if (!fileData) return null;
		const mime = fileData.metadata.mimeType;
		const name = fileData.metadata.name?.toLowerCase() ?? "";
		if (mime !== "application/pdf" && !name.endsWith(".pdf")) return null;
		return fileData.fileBytes.slice();
	}, [fileData]);

	return {
		fileData,
		viewError,
		viewFile,
		handleViewFile,
		previewPdfBytes,
		canDecrypt,
	};
}
