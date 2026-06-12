import { useFilosignContext } from "@filosign/react";
import { useCryptoUnlocked } from "@filosign/react/auth";
import {
	useRecordDocumentView,
	useViewFile,
	type ViewFileResult,
} from "@filosign/react/files";
import type { DocumentViewSource } from "@filosign/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCryptoRequired } from "@/src/lib/auth/use-crypto-required";
import {
	decryptFileForView,
	mapDecryptViewError,
	normalizeViewFileResult,
	recordDocumentViewAfterDecrypt,
} from "@/src/lib/domains/files/hooks/decrypt-file-for-view";
import { mergedPdfBytesForView } from "@/src/lib/domains/files/signable-documents";

export type DecryptableFileRecord = {
	pieceCid: string;
	status?: string;
	kemCiphertext?: string | null;
	encryptedEncryptionKey?: string | null;
	organizationId?: string | null;
	orgKemCiphertext?: string | null;
	orgEncryptedEncryptionKey?: string | null;
	participantAccess?: {
		acknowledged: boolean;
		firstViewedAt: string | null;
	};
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
	viewSource?: DocumentViewSource;
}) {
	const {
		file,
		enabled = true,
		acknowledgeHint = false,
		viewSource = "sign_page",
	} = options;
	const viewFile = useViewFile();
	const recordView = useRecordDocumentView();
	const { rpcQuery } = useFilosignContext();
	const queryClient = useQueryClient();
	const [fileData, setFileData] = useState<ViewFileResult | null>(null);
	const [viewError, setViewError] = useState<string | null>(null);
	const autoDecryptStartedRef = useRef(false);

	const canDecrypt = hasDecryptKeys(file);
	const needsCrypto = enabled && canDecrypt;
	const cryptoUnlocked = useCryptoUnlocked();
	const cryptoRequired = useCryptoRequired({ enabled: needsCrypto });

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
			const result = await decryptFileForView({ file, viewFile });

			if (result) {
				setFileData(normalizeViewFileResult(result));
				await recordDocumentViewAfterDecrypt({
					file,
					viewSource,
					recordView,
					invalidateDetail: () => {
						void queryClient.invalidateQueries({
							queryKey: rpcQuery.files.piece.detail.key({
								input: { pieceCid: file.pieceCid },
							}),
						});
					},
				});
			}
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to load file for viewing";
			setViewError(mapDecryptViewError(message));
		}
	}, [
		file,
		canDecrypt,
		viewFile,
		acknowledgeHint,
		recordView,
		viewSource,
		queryClient,
		rpcQuery.files.piece.detail,
	]);

	useEffect(() => {
		setFileData(null);
		setViewError(null);
		autoDecryptStartedRef.current = false;
	}, [file?.pieceCid]);

	useEffect(() => {
		if (cryptoUnlocked.data === true) setViewError(null);
	}, [cryptoUnlocked.data]);

	useEffect(() => {
		if (!needsCrypto || !file || fileData || viewFile.isPending) return;
		if (viewError) return;
		if (cryptoUnlocked.data !== true) return;
		if (autoDecryptStartedRef.current) return;
		autoDecryptStartedRef.current = true;
		void handleViewFile();
	}, [
		needsCrypto,
		file,
		fileData,
		viewFile.isPending,
		viewError,
		cryptoUnlocked.data,
		handleViewFile,
	]);

	const handleRetryViewFile = useCallback(() => {
		autoDecryptStartedRef.current = false;
		setViewError(null);
		void handleViewFile();
	}, [handleViewFile]);

	const unlockSettled =
		cryptoRequired.needsRecovery || Boolean(cryptoRequired.walletUnlockError);

	// Once fileData is set, decrypt succeeded — do not keep blocking on unlock query state.
	const docCanvasBusy =
		needsCrypto &&
		!fileData &&
		!viewError &&
		!unlockSettled &&
		(cryptoRequired.tryingWalletUnlock ||
			cryptoUnlocked.isPending ||
			cryptoUnlocked.data !== true ||
			viewFile.isPending);

	const [previewPdfBytes, setPreviewPdfBytes] = useState<Uint8Array | null>(
		null,
	);

	useEffect(() => {
		if (!fileData) {
			setPreviewPdfBytes(null);
			return;
		}
		let cancelled = false;
		void mergedPdfBytesForView(fileData).then((bytes) => {
			if (!cancelled) setPreviewPdfBytes(bytes);
		});
		return () => {
			cancelled = true;
		};
	}, [fileData]);

	return {
		fileData,
		viewError,
		viewFile,
		handleViewFile: handleRetryViewFile,
		previewPdfBytes,
		canDecrypt,
		docCanvasBusy,
		showRecoveryInCanvas: needsCrypto && cryptoRequired.needsRecovery,
		recoveryPhrase: cryptoRequired.recoveryPhrase,
		setRecoveryPhrase: cryptoRequired.setRecoveryPhrase,
		recoveryError: cryptoRequired.recoveryError,
		submitRecovery: cryptoRequired.submitRecovery,
		recoveryPending: cryptoRequired.recoveryPending,
		cryptoUnlockError: cryptoRequired.walletUnlockError,
		retryWalletUnlock: cryptoRequired.retryWalletUnlock,
		tryingWalletUnlock: cryptoRequired.tryingWalletUnlock,
	};
}
