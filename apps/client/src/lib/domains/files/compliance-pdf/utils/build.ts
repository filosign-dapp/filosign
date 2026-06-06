import type { ViewFileResult } from "@filosign/react/files";
import { PDFDocument, type PDFImage } from "pdf-lib";
import { mergedPdfBytesForView } from "@/src/lib/domains/files/signable-documents";
import type {
	CompliancePdfBundleOptions,
	CompliancePdfOptions,
} from "../compliance-pdf-types";
import { A4, EMBED_MARGIN } from "../compliance-pdf-types";
import { drawComplianceReport } from "./draw";
import { bytesToPngBytes } from "./images";
import { drawPlacementOverlaysOnDocumentPdf } from "./overlay/field";

export async function buildCompliancePdfOnly(
	options: CompliancePdfBundleOptions,
): Promise<Uint8Array> {
	const doc = await PDFDocument.create();
	await drawComplianceReport(doc, options);
	return doc.save();
}

function isRasterableImageMime(mime: string): boolean {
	return (
		mime.startsWith("image/") &&
		!["image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"].includes(
			mime,
		)
	);
}

function sniffImageMimeFromBytes(bytes: Uint8Array): string | null {
	if (bytes.length < 3) return null;
	if (
		bytes.length >= 8 &&
		bytes[0] === 0x89 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x4e &&
		bytes[3] === 0x47
	) {
		return "image/png";
	}
	if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
		return "image/jpeg";
	}
	if (
		bytes.length >= 12 &&
		bytes[0] === 0x52 &&
		bytes[1] === 0x49 &&
		bytes[2] === 0x46 &&
		bytes[3] === 0x46 &&
		bytes[8] === 0x57 &&
		bytes[9] === 0x45 &&
		bytes[10] === 0x42 &&
		bytes[11] === 0x50
	) {
		return "image/webp";
	}
	if (
		bytes.length >= 6 &&
		bytes[0] === 0x47 &&
		bytes[1] === 0x49 &&
		bytes[2] === 0x46
	) {
		return "image/gif";
	}
	return null;
}

function extensionHintMime(fileName: string | undefined | null): string | null {
	const n = fileName?.toLowerCase() ?? "";
	if (n.endsWith(".png")) return "image/png";
	if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
	if (n.endsWith(".webp")) return "image/webp";
	if (n.endsWith(".gif")) return "image/gif";
	return null;
}

function resolveRasterImageMime(
	bytes: Uint8Array,
	declaredMime: string | undefined,
	fileName: string | undefined | null,
): string | null {
	const d = declaredMime?.trim().toLowerCase() ?? "";
	if (d && isRasterableImageMime(d)) return d;
	const sniffed = sniffImageMimeFromBytes(bytes);
	if (sniffed && isRasterableImageMime(sniffed)) return sniffed;
	const ext = extensionHintMime(fileName);
	if (ext && isRasterableImageMime(ext)) return ext;
	return null;
}

async function embedImagePage(
	doc: PDFDocument,
	bytes: Uint8Array,
	mime: string,
): Promise<void> {
	const page = doc.addPage([A4.w, A4.h]);
	const lower = mime.toLowerCase();
	let image: PDFImage;
	if (lower === "image/png") {
		try {
			image = await doc.embedPng(bytes);
		} catch {
			image = await doc.embedPng(await bytesToPngBytes(bytes, "image/png"));
		}
	} else if (lower === "image/jpeg" || lower === "image/jpg") {
		try {
			image = await doc.embedJpg(bytes);
		} catch {
			image = await doc.embedPng(await bytesToPngBytes(bytes, mime));
		}
	} else {
		image = await doc.embedPng(await bytesToPngBytes(bytes, mime));
	}
	const iw = image.width;
	const ih = image.height;
	const maxW = page.getWidth() - 2 * EMBED_MARGIN;
	const maxH = page.getHeight() - 2 * EMBED_MARGIN;
	const scale = Math.min(maxW / iw, maxH / ih, 1);
	const w = iw * scale;
	const h = ih * scale;
	const x = (page.getWidth() - w) / 2;
	const y = (page.getHeight() - h) / 2;
	page.drawImage(image, { x, y, width: w, height: h });
}

export async function buildDocumentPlusCompliancePdf(
	options: CompliancePdfOptions & { fileData: ViewFileResult },
): Promise<Uint8Array> {
	const { fileData } = options;
	const out = await PDFDocument.create();
	const documentBytes =
		(await mergedPdfBytesForView(fileData)) ?? fileData.fileBytes;
	const documentMime =
		fileData.documents.length > 1 &&
		fileData.documents.every(
			(d) =>
				d.mimeType === "application/pdf" ||
				d.name.toLowerCase().endsWith(".pdf"),
		)
			? "application/pdf"
			: fileData.metadata.mimeType;
	const documentName = fileData.metadata.name;

	if (
		documentMime === "application/pdf" ||
		documentName.toLowerCase().endsWith(".pdf")
	) {
		try {
			const src = await PDFDocument.load(documentBytes);
			const copied = await out.copyPages(src, src.getPageIndices());
			for (const p of copied) {
				out.addPage(p);
			}
			await drawPlacementOverlaysOnDocumentPdf(
				out,
				options.bundle.placementManifest,
				options.bundle.signers,
				options.bundle.fieldCompletions,
			);
		} catch {
			throw new Error(
				"The PDF could not be read. Try downloading the original file separately.",
			);
		}
	} else {
		const resolved = resolveRasterImageMime(
			documentBytes,
			documentMime,
			documentName,
		);
		if (!resolved) {
			throw new Error(
				"Bundled PDF export supports PDF and image documents. Download the file and proof report separately.",
			);
		}
		await embedImagePage(out, documentBytes, resolved);
		await drawPlacementOverlaysOnDocumentPdf(
			out,
			options.bundle.placementManifest,
			options.bundle.signers,
			options.bundle.fieldCompletions,
		);
	}

	await drawComplianceReport(out, {
		...options,
		decryptedDocumentMeta: {
			name: fileData.metadata.name,
			mimeType: fileData.metadata.mimeType,
			sizeBytes: fileData.fileBytes.length,
		},
	});
	return out.save();
}

export function downloadBlobBytes(
	bytes: Uint8Array,
	filenameBase: string,
	mimeType: string,
	extension: string,
) {
	const stamp = new Date().toISOString().replace(/[:.]/g, "-");
	const safe = filenameBase.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48);
	const blob = new Blob([bytes.slice()], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `${safe}-${stamp}.${extension}`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

export function downloadPdfBytes(bytes: Uint8Array, filenameBase: string) {
	downloadBlobBytes(bytes, filenameBase, "application/pdf", "pdf");
}
