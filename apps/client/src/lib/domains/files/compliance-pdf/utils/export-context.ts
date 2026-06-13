import type { ViewFileResult } from "@filosign/react/files";
import { defaultChain } from "@/src/constants";
import { VERIFY_WEB_URL } from "@/src/lib/docs/links";

export function complianceExportContext(fileData: ViewFileResult) {
	return {
		documentSha256: fileData.registerDocumentSha256,
		chainName: defaultChain.name,
		explorerBaseUrl: defaultChain.blockExplorers?.default?.url ?? null,
		verifyWebUrl: VERIFY_WEB_URL,
		decryptedDocumentMeta: {
			name: fileData.metadata.name,
			mimeType: fileData.metadata.mimeType,
			sizeBytes: fileData.fileBytes.length,
		},
	} as const;
}
