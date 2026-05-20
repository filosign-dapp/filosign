import type { ViewFileResult } from "@filosign/react/files";
import type { ComplianceBundle, PlacementManifest } from "@filosign/shared";
import {
	PDFDocument,
	type PDFFont,
	type PDFImage,
	rgb,
	StandardFonts,
} from "pdf-lib";
import { A4, EMBED_MARGIN } from "./compliance-pdf-constants";
import { drawComplianceReport } from "./compliance-pdf-draw";
import { bytesToPngBytes } from "./compliance-pdf-images";
import {
	fieldPlacementStatusFromSignerRow,
	signersByNormalizedRecipientEmail,
} from "./compliance-pdf-placement";
import { lineHeightAt, wrapLines } from "./compliance-pdf-text";
import type {
	CompliancePdfBundleOptions,
	CompliancePdfOptions,
} from "./compliance-pdf-types";

/** SHA-256 over bytes as lowercase 0x-prefixed hex (for compliance export query + appendix). */
export async function sha256HexOfBytes(
	bytes: Uint8Array,
): Promise<`0x${string}`> {
	const buf = bytes.buffer.slice(
		bytes.byteOffset,
		bytes.byteOffset + bytes.byteLength,
	) as ArrayBuffer;
	const digest = await crypto.subtle.digest("SHA-256", buf);
	const hex = [...new Uint8Array(digest)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return `0x${hex}` as `0x${string}`;
}

type OverlayTextSeg = { text: string; font: PDFFont; size: number };

function overlaySegTotalHeight(segments: OverlayTextSeg[]): number {
	return segments.reduce((acc, s) => acc + lineHeightAt(s.font, s.size), 0);
}

async function drawPlacementOverlaysOnDocumentPdf(
	doc: PDFDocument,
	placementManifest: PlacementManifest,
	signers: ComplianceBundle["signers"],
): Promise<void> {
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
	const n = doc.getPageCount();
	const signersByRecipient = signersByNormalizedRecipientEmail(signers);

	for (const f of placementManifest.fields) {
		const pi = f.pageIndex;
		if (pi < 0 || pi >= n) continue;
		const page = doc.getPage(pi);
		const w = page.getWidth();
		const h = page.getHeight();
		const rw = f.rect.width * w;
		const rh = f.rect.height * h;
		const x = f.rect.x * w;
		const yTop = f.rect.y * h;
		const yPdf = h - yTop - rh;

		const recipientKey = f.assignedRecipientEmail.trim().toLowerCase();
		const signerRow = signersByRecipient.get(recipientKey);
		const st = fieldPlacementStatusFromSignerRow(signerRow, f.id);
		const border =
			st === "signed"
				? rgb(0.1, 0.55, 0.25)
				: st === "draft"
					? rgb(0.85, 0.5, 0.1)
					: rgb(0.55, 0.55, 0.55);
		const bg =
			st === "signed"
				? rgb(0.75, 0.95, 0.8)
				: st === "draft"
					? rgb(1, 0.94, 0.85)
					: rgb(0.94, 0.94, 0.94);

		page.drawRectangle({
			x,
			y: yPdf,
			width: rw,
			height: rh,
			borderColor: border,
			borderWidth: 1.5,
			color: bg,
			opacity: 0.38,
		});
		const displayName = (signerRow?.displayName ?? "").trim() || "Signer";
		const email = (signerRow?.email ?? "").trim() || "-";
		const statusWord =
			st === "signed" ? "Signed" : st === "draft" ? "Draft" : "Pending";
		const footerText = `${f.type} / ${statusWord}${f.required ? " / required" : " / optional"}`;

		const pad = Math.min(6, Math.max(3, Math.min(rw, rh) * 0.06));
		const innerW = Math.max(28, rw - 2 * pad);

		let nameSize = Math.min(8.5, Math.max(6, Math.min(rh / 5, rw / 22)));

		const buildSegments = (): OverlayTextSeg[] => {
			const detailSize = nameSize * 0.9;
			const tagSize = detailSize * 0.95;
			const parts: OverlayTextSeg[] = [];
			for (const t of wrapLines(displayName, innerW, fontBold, nameSize)) {
				parts.push({ text: t, font: fontBold, size: nameSize });
			}
			for (const t of wrapLines(email, innerW, font, detailSize)) {
				parts.push({ text: t, font, size: detailSize });
			}
			for (const t of wrapLines(footerText, innerW, font, tagSize)) {
				parts.push({ text: t, font, size: tagSize });
			}
			return parts;
		};

		let segments = buildSegments();
		const cap = rh - 2 * pad;
		while (overlaySegTotalHeight(segments) > cap && nameSize > 5.5) {
			nameSize -= 0.5;
			segments = buildSegments();
		}

		if (overlaySegTotalHeight(segments) > cap) {
			const kept: OverlayTextSeg[] = [];
			let used = 0;
			for (const s of segments) {
				const step = lineHeightAt(s.font, s.size);
				if (used + step > cap) break;
				kept.push(s);
				used += step;
			}
			if (kept.length > 0) {
				const last = kept[kept.length - 1];
				const t = last.text;
				kept[kept.length - 1] = {
					...last,
					text:
						t.length > 8
							? `${t.slice(0, Math.max(1, t.length - 4))}...`
							: `${t}...`,
				};
			}
			segments = kept;
		}

		if (segments.length === 0) continue;

		const blockH = Math.min(
			cap,
			Math.max(
				overlaySegTotalHeight(segments),
				lineHeightAt(fontBold, nameSize),
			),
		);
		page.drawRectangle({
			x: x + 0.75,
			y: yPdf + rh - blockH - pad * 0.5,
			width: Math.max(0, rw - 1.5),
			height: blockH + pad * 0.5,
			color: rgb(1, 1, 1),
			opacity: 0.92,
			borderWidth: 0,
		});

		let baseline = yPdf + rh - pad - segments[0].size * 0.85;
		for (const seg of segments) {
			if (baseline < yPdf + pad) break;
			page.drawText(seg.text, {
				x: x + pad,
				y: baseline,
				size: seg.size,
				font: seg.font,
				color: rgb(0.1, 0.1, 0.11),
			});
			baseline -= lineHeightAt(seg.font, seg.size);
		}
	}
}

export async function buildCompliancePdfOnly(
	options: CompliancePdfBundleOptions,
): Promise<Uint8Array> {
	const doc = await PDFDocument.create();
	await drawComplianceReport(doc, options);
	return doc.save();
}

function isPdfFile(fileData: ViewFileResult): boolean {
	const mime = fileData.metadata.mimeType?.toLowerCase() ?? "";
	const name = fileData.metadata.name?.toLowerCase() ?? "";
	return mime === "application/pdf" || name.endsWith(".pdf");
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

	if (isPdfFile(fileData)) {
		try {
			const src = await PDFDocument.load(fileData.fileBytes);
			const copied = await out.copyPages(src, src.getPageIndices());
			for (const p of copied) {
				out.addPage(p);
			}
			await drawPlacementOverlaysOnDocumentPdf(
				out,
				options.bundle.placementManifest,
				options.bundle.signers,
			);
		} catch {
			throw new Error(
				"The PDF could not be read. Try downloading the original file separately.",
			);
		}
	} else {
		const resolved = resolveRasterImageMime(
			fileData.fileBytes,
			fileData.metadata.mimeType,
			fileData.metadata.name,
		);
		if (!resolved) {
			throw new Error(
				"Bundled PDF export supports PDF and image documents. Download the file and compliance appendix separately.",
			);
		}
		await embedImagePage(out, fileData.fileBytes, resolved);
		await drawPlacementOverlaysOnDocumentPdf(
			out,
			options.bundle.placementManifest,
			options.bundle.signers,
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

export function downloadPdfBytes(bytes: Uint8Array, filenameBase: string) {
	const stamp = new Date().toISOString().replace(/[:.]/g, "-");
	const safe = filenameBase.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48);
	const blob = new Blob([bytes.slice()], { type: "application/pdf" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `${safe}-${stamp}.pdf`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
