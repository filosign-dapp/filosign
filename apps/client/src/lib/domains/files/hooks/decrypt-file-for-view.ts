import type { ViewFileResult } from "@filosign/react/files";
import type { DocumentViewSource } from "@filosign/shared";
import type { DecryptableFileRecord } from "@/src/lib/domains/files/hooks/use-decrypted-file-view";

type ViewFileMutate = {
	mutateAsync: (
		input:
			| {
					pieceCid: string;
					kemCiphertext: string;
					encryptedEncryptionKey: string;
			  }
			| {
					variant: "org";
					pieceCid: string;
					organizationId: string;
					orgKemCiphertext: string;
					orgEncryptedEncryptionKey: string;
			  },
	) => Promise<ViewFileResult>;
};

export async function decryptFileForView(args: {
	file: DecryptableFileRecord;
	viewFile: ViewFileMutate;
}): Promise<ViewFileResult | undefined> {
	const { file, viewFile } = args;

	if (file.kemCiphertext && file.encryptedEncryptionKey) {
		return viewFile.mutateAsync({
			pieceCid: file.pieceCid,
			kemCiphertext: file.kemCiphertext,
			encryptedEncryptionKey: file.encryptedEncryptionKey,
		});
	}

	if (
		file.organizationId &&
		file.orgKemCiphertext &&
		file.orgEncryptedEncryptionKey
	) {
		return viewFile.mutateAsync({
			variant: "org",
			pieceCid: file.pieceCid,
			organizationId: file.organizationId,
			orgKemCiphertext: file.orgKemCiphertext,
			orgEncryptedEncryptionKey: file.orgEncryptedEncryptionKey,
		});
	}

	return undefined;
}

export function normalizeViewFileResult(
	result: ViewFileResult,
): ViewFileResult {
	return {
		...result,
		metadata: {
			name: result.metadata.name ?? result.documents[0]?.name ?? "",
			mimeType:
				result.metadata.mimeType ??
				result.documents[0]?.mimeType ??
				"application/octet-stream",
		},
	};
}

export function mapDecryptViewError(message: string): string {
	return message === "No unlocked key seed found"
		? "Unlock encryption keys with your wallet or recovery phrase."
		: message;
}

export async function recordDocumentViewAfterDecrypt(args: {
	file: DecryptableFileRecord;
	viewSource: DocumentViewSource;
	recordView: {
		mutateAsync: (input: {
			pieceCid: string;
			source: DocumentViewSource;
		}) => Promise<unknown>;
	};
	invalidateDetail: () => void;
}): Promise<void> {
	if (!args.file.participantAccess?.acknowledged) return;

	try {
		await args.recordView.mutateAsync({
			pieceCid: args.file.pieceCid,
			source: args.viewSource,
		});
		args.invalidateDetail();
	} catch (err) {
		console.warn("[document-view] recordView failed", err);
	}
}
