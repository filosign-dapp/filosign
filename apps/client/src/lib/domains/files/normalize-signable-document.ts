import {
	canonicalSignablePdfFileName,
	SIGNABLE_DOCUMENT_LIMITS,
	type SignableDocumentKind,
	validateSignableDocumentUpload,
} from "@filosign/shared";
import { PDFDocument, type PDFImage } from "pdf-lib";
import { bytesToPngBytes } from "@/src/lib/domains/files/compliance-pdf/utils/images";

export type NormalizedSignableDocument = {
	pdfFile: File;
	displayName: string;
	sourceMimeType: string;
	pageCount: number;
};

export class SignableDocumentNormalizeError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SignableDocumentNormalizeError";
	}
}

async function countPdfPages(bytes: Uint8Array): Promise<number> {
	const doc = await PDFDocument.load(bytes);
	return doc.getPageCount();
}

async function embedRasterImage(
	doc: PDFDocument,
	bytes: Uint8Array,
	mime: string,
): Promise<PDFImage> {
	const lower = mime.toLowerCase();
	if (lower === "image/png") {
		try {
			return await doc.embedPng(bytes);
		} catch {
			return await doc.embedPng(await bytesToPngBytes(bytes, "image/png"));
		}
	}
	if (lower === "image/jpeg" || lower === "image/jpg") {
		try {
			return await doc.embedJpg(bytes);
		} catch {
			return await doc.embedPng(await bytesToPngBytes(bytes, mime));
		}
	}
	return await doc.embedPng(await bytesToPngBytes(bytes, mime));
}

async function imageBytesToPdf(
	bytes: Uint8Array,
	mime: string,
): Promise<Uint8Array> {
	const doc = await PDFDocument.create();
	const image = await embedRasterImage(doc, bytes, mime);
	const page = doc.addPage([image.width, image.height]);
	page.drawImage(image, {
		x: 0,
		y: 0,
		width: image.width,
		height: image.height,
	});
	const out = await doc.save();
	return new Uint8Array(out);
}

function assertPageCountWithinLimit(pageCount: number, fileName: string): void {
	if (pageCount > SIGNABLE_DOCUMENT_LIMITS.maxPagesPerDocument) {
		throw new SignableDocumentNormalizeError(
			`${fileName} exceeds the ${SIGNABLE_DOCUMENT_LIMITS.maxPagesPerDocument}-page limit after preparation`,
		);
	}
	if (pageCount < 1) {
		throw new SignableDocumentNormalizeError(
			`${fileName} could not be prepared for signing`,
		);
	}
}

async function normalizePdfUpload(
	file: File,
	sourceMimeType: string,
): Promise<NormalizedSignableDocument> {
	const bytes = new Uint8Array(await file.arrayBuffer());
	let pageCount: number;
	try {
		pageCount = await countPdfPages(bytes);
	} catch {
		throw new SignableDocumentNormalizeError(
			`${file.name} could not be read. Remove password protection or save as PDF and try again.`,
		);
	}
	assertPageCountWithinLimit(pageCount, file.name);
	const pdfFile = new File(
		[Uint8Array.from(bytes)],
		canonicalSignablePdfFileName(file.name),
		{ type: "application/pdf" },
	);
	return {
		pdfFile,
		displayName: file.name,
		sourceMimeType,
		pageCount,
	};
}

async function normalizeImageUpload(
	file: File,
	sourceMimeType: string,
): Promise<NormalizedSignableDocument> {
	const bytes = new Uint8Array(await file.arrayBuffer());
	let pdfBytes: Uint8Array;
	try {
		pdfBytes = await imageBytesToPdf(bytes, sourceMimeType);
	} catch {
		throw new SignableDocumentNormalizeError(
			`${file.name} could not be prepared as PDF for signing`,
		);
	}
	const pageCount = 1;
	assertPageCountWithinLimit(pageCount, file.name);
	const pdfFile = new File(
		[Uint8Array.from(pdfBytes)],
		canonicalSignablePdfFileName(file.name),
		{ type: "application/pdf" },
	);
	return {
		pdfFile,
		displayName: file.name,
		sourceMimeType,
		pageCount,
	};
}

export async function normalizeSignableDocumentToPdf(
	file: File,
): Promise<NormalizedSignableDocument> {
	const validated = validateSignableDocumentUpload({
		name: file.name,
		sizeBytes: file.size,
		browserMime: file.type,
	});
	if (!validated.ok) {
		throw new SignableDocumentNormalizeError(validated.message);
	}

	const kind: SignableDocumentKind = validated.kind;
	if (kind === "pdf") {
		return normalizePdfUpload(file, validated.mimeType);
	}
	return normalizeImageUpload(file, validated.mimeType);
}

export async function countStoredSignablePdfPages(
	bytes: Uint8Array,
): Promise<number> {
	return countPdfPages(bytes);
}
