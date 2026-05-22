import type { ComplianceBundle } from "@filosign/shared";
import type { ComplianceCopyLine, ComplianceCopyTextStyle } from "./utils/copy";

/** A4 width/height in PDF points (72 pt/in). */
export const A4 = { w: 595, h: 842 } as const;

/** Page margin for embedded raster/PDF pages in bundled export. */
export const EMBED_MARGIN = 48;

export type CompliancePdfBundleOptions = {
	bundle: ComplianceBundle;
	bundleHash: `0x${string}`;
	exportId: string;
	chainName: string;
	explorerBaseUrl: string | null;
	/** Client-computed digest of decrypted bytes, if available (sent to export logging). */
	documentSha256?: string;
	/** When the document was decrypted for bundling, include basic file facts in the appendix. */
	decryptedDocumentMeta?: {
		name: string | null | undefined;
		mimeType: string | null | undefined;
		sizeBytes: number;
	} | null;
};

export type CompliancePdfTextStyle = ComplianceCopyTextStyle;

/** One rendered line in the compliance PDF (same shape as {@link ComplianceCopyLine}). */
export type CompliancePdfLine = ComplianceCopyLine;

export type CompliancePdfSummary = {
	explorerBaseUrl: string | null;
	fields: Array<{
		label: string;
		value: string;
		linkUri?: string | null;
	}>;
	sections: Array<{ title: string; lines: CompliancePdfLine[] }>;
};

export type CompliancePdfOptions = CompliancePdfBundleOptions;
